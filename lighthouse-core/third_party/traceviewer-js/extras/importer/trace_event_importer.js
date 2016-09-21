/**
Copyright (c) 2012 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/base64.js");
require("../../base/color_scheme.js");
require("../../base/range.js");
require("../../base/unit.js");
require("../../base/utils.js");
require("./trace_code_entry.js");
require("./trace_code_map.js");
require("./v8/codemap.js");
require("../../importer/context_processor.js");
require("../../importer/importer.js");
require("../../model/comment_box_annotation.js");
require("../../model/constants.js");
require("../../model/container_memory_dump.js");
require("../../model/counter_series.js");
require("../../model/flow_event.js");
require("../../model/global_memory_dump.js");
require("../../model/heap_dump.js");
require("../../model/instant_event.js");
require("../../model/memory_allocator_dump.js");
require("../../model/model.js");
require("../../model/process_memory_dump.js");
require("../../model/rect_annotation.js");
require("../../model/scoped_id.js");
require("../../model/slice_group.js");
require("../../model/vm_region.js");
require("../../model/x_marker_annotation.js");
require("../../value/numeric.js");

'use strict';

/**
 * @fileoverview TraceEventImporter imports TraceEvent-formatted data
 * into the provided model.
 */
global.tr.exportTo('tr.e.importer', function() {
  var Base64 = tr.b.Base64;
  var deepCopy = tr.b.deepCopy;
  var ColorScheme = tr.b.ColorScheme;

  function getEventColor(event, opt_customName) {
    if (event.cname)
      return ColorScheme.getColorIdForReservedName(event.cname);
    else if (opt_customName || event.name) {
      return ColorScheme.getColorIdForGeneralPurposeString(
          opt_customName || event.name);
    }
  }

  var PRODUCER = 'producer';
  var CONSUMER = 'consumer';
  var STEP = 'step';

  var BACKGROUND = tr.model.ContainerMemoryDump.LevelOfDetail.BACKGROUND;
  var LIGHT = tr.model.ContainerMemoryDump.LevelOfDetail.LIGHT;
  var DETAILED = tr.model.ContainerMemoryDump.LevelOfDetail.DETAILED;
  var MEMORY_DUMP_LEVEL_OF_DETAIL_ORDER = [undefined, BACKGROUND, LIGHT,
                                           DETAILED];

  var GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX = 'global/';

  var ASYNC_CLOCK_SYNC_EVENT_TITLE_PREFIX = 'ClockSyncEvent.';

  // Map from raw memory dump byte stat names to model byte stat names. See
  // //base/trace_event/process_memory_maps.cc in Chromium.
  var BYTE_STAT_NAME_MAP = {
    'pc': 'privateCleanResident',
    'pd': 'privateDirtyResident',
    'sc': 'sharedCleanResident',
    'sd': 'sharedDirtyResident',
    'pss': 'proportionalResident',
    'sw': 'swapped'
  };

  // See tr.model.MemoryAllocatorDump 'weak' field and
  // base::trace_event::MemoryAllocatorDump::Flags::WEAK in the Chromium
  // codebase.
  var WEAK_MEMORY_ALLOCATOR_DUMP_FLAG = 1 << 0;

  // Object type name patterns for various compilers.
  var OBJECT_TYPE_NAME_PATTERNS = [
    {
      // Clang.
      prefix: 'const char *WTF::getStringWithTypeName() [T = ',
      suffix: ']'
    },
    {
      // GCC.
      prefix: 'const char* WTF::getStringWithTypeName() [with T = ',
      suffix: ']'
    },
    {
      // Microsoft Visual C++
      prefix: 'const char *__cdecl WTF::getStringWithTypeName<',
      suffix: '>(void)'
    }
  ];

  // The list of fields on the trace that are known to contain subtraces.
  var SUBTRACE_FIELDS = new Set([
    'powerTraceAsString',
    'systemTraceEvents',
  ]);

  // The complete list of fields on the trace that should not be treated as
  // trace metadata.
  var NON_METADATA_FIELDS = new Set([
    'samples',
    'stackFrames',
    'traceAnnotations',
    'traceEvents'
  ]);
  // TODO(charliea): Replace this with the spread (...) operator in literal
  // above once v8 is updated to a sufficiently recent version (>M45).
  for (var subtraceField in SUBTRACE_FIELDS)
    NON_METADATA_FIELDS.add(subtraceField);

  function TraceEventImporter(model, eventData) {
    this.importPriority = 1;
    this.model_ = model;
    this.events_ = undefined;
    this.sampleEvents_ = undefined;
    this.stackFrameEvents_ = undefined;
    this.subtraces_ = [];
    this.eventsWereFromString_ = false;
    this.softwareMeasuredCpuCount_ = undefined;


    this.allAsyncEvents_ = [];
    this.allFlowEvents_ = [];
    this.allObjectEvents_ = [];

    this.contextProcessorPerThread = {};

    this.traceEventSampleStackFramesByName_ = {};

    this.v8ProcessCodeMaps_ = {};
    this.v8ProcessRootStackFrame_ = {};
    this.v8SamplingData_ = [];

    // For tracking async events that is used to create back-compat clock sync
    // event.
    this.asyncClockSyncStart_ = undefined;
    this.asyncClockSyncFinish_ = undefined;

    // Dump ID -> PID -> [process memory dump events].
    this.allMemoryDumpEvents_ = {};

    // PID -> Object type ID -> Object type name.
    this.objectTypeNameMap_ = {};

    // For old Chrome traces with no clock domain metadata, just use a
    // placeholder clock domain.
    this.clockDomainId_ = tr.model.ClockDomainId.UNKNOWN_CHROME_LEGACY;
    // A function able to transform timestamps in |clockDomainId| to timestamps
    // in the model clock domain.
    this.toModelTime_ = undefined;

    if (typeof(eventData) === 'string' || eventData instanceof String) {
      eventData = eventData.trim();
      // If the event data begins with a [, then we know it should end with a ].
      // The reason we check for this is because some tracing implementations
      // cannot guarantee that a ']' gets written to the trace file. So, we are
      // forgiving and if this is obviously the case, we fix it up before
      // throwing the string at JSON.parse.
      if (eventData[0] === '[') {
        eventData = eventData.replace(/\s*,\s*$/, '');
        if (eventData[eventData.length - 1] !== ']')
          eventData = eventData + ']';
      }

      this.events_ = JSON.parse(eventData);
      this.eventsWereFromString_ = true;
    } else {
      this.events_ = eventData;
    }

    this.traceAnnotations_ = this.events_.traceAnnotations;

    // Some trace_event implementations put the actual trace events
    // inside a container. E.g { ... , traceEvents: [ ] }
    // If we see that, just pull out the trace events.
    if (this.events_.traceEvents) {
      var container = this.events_;
      this.events_ = this.events_.traceEvents;

      // Some trace authors store subtraces as specific properties of the trace.
      for (var subtraceField of SUBTRACE_FIELDS)
        if (container[subtraceField])
          this.subtraces_.push(container[subtraceField]);

      // Sampling data.
      this.sampleEvents_ = container.samples;
      this.stackFrameEvents_ = container.stackFrames;

      // Some implementations specify displayTimeUnit
      if (container.displayTimeUnit) {
        var unitName = container.displayTimeUnit;
        var unit = tr.b.TimeDisplayModes[unitName];
        if (unit === undefined) {
          throw new Error('Unit ' + unitName + ' is not supported.');
        }
        this.model_.intrinsicTimeUnit = unit;
      }

      // Any other fields in the container should be treated as metadata.
      for (var fieldName in container) {
        if (NON_METADATA_FIELDS.has(fieldName))
          continue;

        this.model_.metadata.push(
            { name: fieldName, value: container[fieldName] });

        if (fieldName === 'metadata') {
          var metadata = container[fieldName];
          if (metadata['highres-ticks'])
            this.model_.isTimeHighResolution = metadata['highres-ticks'];
          if (metadata['clock-domain'])
            this.clockDomainId_ = metadata['clock-domain'];
        }
      }
    }
  }

  /**
   * @return {boolean} Whether obj is a TraceEvent array.
   */
  TraceEventImporter.canImport = function(eventData) {
    // May be encoded JSON. But we dont want to parse it fully yet.
    // Use a simple heuristic:
    //   - eventData that starts with [ are probably trace_event
    //   - eventData that starts with { are probably trace_event
    // May be encoded JSON. Treat files that start with { as importable by us.
    if (typeof(eventData) === 'string' || eventData instanceof String) {
      eventData = eventData.trim();
      return eventData[0] === '{' || eventData[0] === '[';
    }

    // Might just be an array of events
    if (eventData instanceof Array && eventData.length && eventData[0].ph)
      return true;

    // Might be an object with a traceEvents field in it.
    if (eventData.traceEvents) {
      if (eventData.traceEvents instanceof Array) {
        if (eventData.traceEvents.length && eventData.traceEvents[0].ph)
          return true;
        if (eventData.samples.length && eventData.stackFrames !== undefined)
          return true;
      }
    }

    return false;
  };

  TraceEventImporter.prototype = {
    __proto__: tr.importer.Importer.prototype,

    get importerName() {
      return 'TraceEventImporter';
    },

    extractSubtraces: function() {
      // Because subtraces can be quite large, we need to make sure that we
      // don't hold a reference to the memory.
      var subtraces = this.subtraces_;
      this.subtraces_ = [];
      return subtraces;
    },

    /**
     * Deep copying is only needed if the trace was given to us as events.
     */
    deepCopyIfNeeded_: function(obj) {
      if (obj === undefined)
        obj = {};
      if (this.eventsWereFromString_)
        return obj;
      return deepCopy(obj);
    },

    /**
     * Always perform deep copying.
     */
    deepCopyAlways_: function(obj) {
      if (obj === undefined)
        obj = {};
      return deepCopy(obj);
    },

    /**
     * Helper to process an async event.
     */
    processAsyncEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allAsyncEvents_.push({
        sequenceNumber: this.allAsyncEvents_.length,
        event: event,
        thread: thread
      });
    },

    /**
     * Helper to process a flow event.
     */
    processFlowEvent: function(event, opt_slice) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allFlowEvents_.push({
        refGuid: tr.b.GUID.getLastSimpleGuid(),
        sequenceNumber: this.allFlowEvents_.length,
        event: event,
        slice: opt_slice,  // slice for events that have flow info
        thread: thread
      });
    },

    /**
     * Helper that creates and adds samples to a Counter object based on
     * 'C' phase events.
     */
    processCounterEvent: function(event) {
      var ctrName;
      if (event.id !== undefined)
        ctrName = event.name + '[' + event.id + ']';
      else
        ctrName = event.name;

      var ctr = this.model_.getOrCreateProcess(event.pid)
          .getOrCreateCounter(event.cat, ctrName);
      var reservedColorId = event.cname ? getEventColor(event) : undefined;

      // Initialize the counter's series fields if needed.
      if (ctr.numSeries === 0) {
        for (var seriesName in event.args) {
          var colorId = reservedColorId ||
              getEventColor(event, ctr.name + '.' + seriesName);
          ctr.addSeries(new tr.model.CounterSeries(seriesName, colorId));
        }

        if (ctr.numSeries === 0) {
          this.model_.importWarning({
            type: 'counter_parse_error',
            message: 'Expected counter ' + event.name +
                ' to have at least one argument to use as a value.'
          });

          // Drop the counter.
          delete ctr.parent.counters[ctr.name];
          return;
        }
      }

      var ts = this.toModelTimeFromUs_(event.ts);
      ctr.series.forEach(function(series) {
        var val = event.args[series.name] ? event.args[series.name] : 0;
        series.addCounterSample(ts, val);
      });
    },

    scopedIdForEvent_: function(event) {
      return new tr.model.ScopedId(
          event.scope || tr.model.OBJECT_DEFAULT_SCOPE, event.id);
    },

    processObjectEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      this.allObjectEvents_.push({
        sequenceNumber: this.allObjectEvents_.length,
        event: event,
        thread: thread});
      if (thread.guid in this.contextProcessorPerThread) {
        var processor = this.contextProcessorPerThread[thread.guid];
        var scopedId = this.scopedIdForEvent_(event);
        if (event.ph === 'D')
          processor.destroyContext(scopedId);
        // The context processor maintains a cache of unique context objects and
        // active context sets to reduce memory usage. If an object is modified,
        // we should invalidate this cache, because otherwise context sets from
        // before and after the modification may erroneously point to the same
        // context snapshot (as both are the same set/object instances).
        processor.invalidateContextCacheForSnapshot(scopedId);
      }
    },

    processContextEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid).
          getOrCreateThread(event.tid);
      if (!(thread.guid in this.contextProcessorPerThread)) {
        this.contextProcessorPerThread[thread.guid] =
            new tr.importer.ContextProcessor(this.model_);
      }
      var scopedId = this.scopedIdForEvent_(event);
      var contextType = event.name;
      var processor = this.contextProcessorPerThread[thread.guid];
      if (event.ph === '(') {
        processor.enterContext(contextType, scopedId);
      } else if (event.ph === ')') {
        processor.leaveContext(contextType, scopedId);
      } else {
        this.model_.importWarning({
          type: 'unknown_context_phase',
          message: 'Unknown context event phase: ' + event.ph + '.'
        });
      }
    },

    setContextsFromThread_: function(thread, slice) {
      if (thread.guid in this.contextProcessorPerThread) {
        slice.contexts =
            this.contextProcessorPerThread[thread.guid].activeContexts;
      }
    },

    processDurationEvent: function(event) {
      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);
      var ts = this.toModelTimeFromUs_(event.ts);
      if (!thread.sliceGroup.isTimestampValidForBeginOrEnd(ts)) {
        this.model_.importWarning({
          type: 'duration_parse_error',
          message: 'Timestamps are moving backward.'
        });
        return;
      }

      if (event.ph === 'B') {
        var slice = thread.sliceGroup.beginSlice(
            event.cat, event.name, this.toModelTimeFromUs_(event.ts),
            this.deepCopyIfNeeded_(event.args),
            this.toModelTimeFromUs_(event.tts), event.argsStripped,
            getEventColor(event));
        slice.startStackFrame = this.getStackFrameForEvent_(event);
        this.setContextsFromThread_(thread, slice);
      } else if (event.ph === 'I' || event.ph === 'i' || event.ph === 'R') {
        if (event.s !== undefined && event.s !== 't')
          throw new Error('This should never happen');

        thread.sliceGroup.beginSlice(event.cat, event.name,
                                     this.toModelTimeFromUs_(event.ts),
                                     this.deepCopyIfNeeded_(event.args),
                                     this.toModelTimeFromUs_(event.tts),
                                     event.argsStripped,
                                     getEventColor(event));
        var slice = thread.sliceGroup.endSlice(
            this.toModelTimeFromUs_(event.ts),
            this.toModelTimeFromUs_(event.tts));
        slice.startStackFrame = this.getStackFrameForEvent_(event);
        slice.endStackFrame = undefined;
      } else {
        if (!thread.sliceGroup.openSliceCount) {
          this.model_.importWarning({
            type: 'duration_parse_error',
            message: 'E phase event without a matching B phase event.'
          });
          return;
        }

        var slice = thread.sliceGroup.endSlice(
            this.toModelTimeFromUs_(event.ts),
            this.toModelTimeFromUs_(event.tts),
            getEventColor(event));
        if (event.name && slice.title != event.name) {
          this.model_.importWarning({
            type: 'title_match_error',
            message: 'Titles do not match. Title is ' +
                slice.title + ' in openSlice, and is ' +
                event.name + ' in endSlice'
          });
        }
        slice.endStackFrame = this.getStackFrameForEvent_(event);

        this.mergeArgsInto_(slice.args, event.args, slice.title);
      }
    },

    mergeArgsInto_: function(dstArgs, srcArgs, eventName) {
      for (var arg in srcArgs) {
        if (dstArgs[arg] !== undefined) {
          this.model_.importWarning({
            type: 'arg_merge_error',
            message: 'Different phases of ' + eventName +
                ' provided values for argument ' + arg + '.' +
                ' The last provided value will be used.'
          });
        }
        dstArgs[arg] = this.deepCopyIfNeeded_(srcArgs[arg]);
      }
    },

    processCompleteEvent: function(event) {
      // Preventing the overhead slices from making it into the model. This
      // only applies to legacy traces, as the overhead traces have been
      // removed from the chromium code.
      if (event.cat !== undefined &&
          event.cat.indexOf('trace_event_overhead') > -1)
        return undefined;

      var thread = this.model_.getOrCreateProcess(event.pid)
          .getOrCreateThread(event.tid);

      if (event.flow_out) {
        if (event.flow_in)
          event.flowPhase = STEP;
        else
          event.flowPhase = PRODUCER;
      } else if (event.flow_in) {
        event.flowPhase = CONSUMER;
      }

      var slice = thread.sliceGroup.pushCompleteSlice(event.cat, event.name,

          this.toModelTimeFromUs_(event.ts),
          this.maybeToModelTimeFromUs_(event.dur),
          this.maybeToModelTimeFromUs_(event.tts),
          this.maybeToModelTimeFromUs_(event.tdur),
          this.deepCopyIfNeeded_(event.args),
          event.argsStripped,
          getEventColor(event),
          event.bind_id);
      slice.startStackFrame = this.getStackFrameForEvent_(event);
      slice.endStackFrame = this.getStackFrameForEvent_(event, true);
      this.setContextsFromThread_(thread, slice);

      return slice;
    },

    processJitCodeEvent: function(event) {
      if (this.v8ProcessCodeMaps_[event.pid] === undefined)
        this.v8ProcessCodeMaps_[event.pid] = new tr.e.importer.TraceCodeMap();
      var map = this.v8ProcessCodeMaps_[event.pid];

      var data = event.args.data;
      // TODO(dsinclair): There are _a lot_ of JitCode events so I'm skipping
      // the display for now. Can revisit later if we want to show them.
      // Handle JitCodeMoved and JitCodeAdded event.
      if (event.name === 'JitCodeMoved')
        map.moveEntry(data.code_start, data.new_code_start, data.code_len);
      else  // event.name === 'JitCodeAdded'
        map.addEntry(data.code_start, data.code_len, data.name, data.script_id);
    },

    processMetadataEvent: function(event) {
      // V8 JIT events are currently logged as phase 'M' so we need to
      // separate them out and handle specially.
      if (event.name === 'JitCodeAdded' || event.name === 'JitCodeMoved') {
        this.v8SamplingData_.push(event);
        return;
      }

      // The metadata events aren't useful without args.
      if (event.argsStripped)
        return;

      if (event.name === 'process_name') {
        var process = this.model_.getOrCreateProcess(event.pid);
        process.name = event.args.name;
      } else if (event.name === 'process_labels') {
        var process = this.model_.getOrCreateProcess(event.pid);
        var labels = event.args.labels.split(',');
        for (var i = 0; i < labels.length; i++)
          process.addLabelIfNeeded(labels[i]);
      } else if (event.name === 'process_sort_index') {
        var process = this.model_.getOrCreateProcess(event.pid);
        process.sortIndex = event.args.sort_index;
      } else if (event.name === 'thread_name') {
        var thread = this.model_.getOrCreateProcess(event.pid).
            getOrCreateThread(event.tid);
        thread.name = event.args.name;
      } else if (event.name === 'thread_sort_index') {
        var thread = this.model_.getOrCreateProcess(event.pid).
            getOrCreateThread(event.tid);
        thread.sortIndex = event.args.sort_index;
      } else if (event.name === 'num_cpus') {
        var n = event.args.number;
        // Not all render processes agree on the cpu count in trace_event. Some
        // processes will report 1, while others will report the actual cpu
        // count. To deal with this, take the max of what is reported.
        if (this.softwareMeasuredCpuCount_ !== undefined)
          n = Math.max(n, this.softwareMeasuredCpuCount_);
        this.softwareMeasuredCpuCount_ = n;
      } else if (event.name === 'stackFrames') {
        var stackFrames = event.args.stackFrames;
        if (stackFrames === undefined) {
          this.model_.importWarning({
            type: 'metadata_parse_error',
            message: 'No stack frames found in a \'' + event.name +
                '\' metadata event'
          });
        } else {
          this.importStackFrames_(stackFrames, 'p' + event.pid + ':');
        }
      } else if (event.name === 'typeNames') {
        var objectTypeNameMap = event.args.typeNames;
        if (objectTypeNameMap === undefined) {
          this.model_.importWarning({
            type: 'metadata_parse_error',
            message: 'No mapping from object type IDs to names found in a \'' +
                event.name + '\' metadata event'
          });
        } else {
          this.importObjectTypeNameMap_(objectTypeNameMap, event.pid);
        }
      } else if (event.name === 'TraceConfig') {
          this.model_.metadata.push(
              {name: 'TraceConfig', value: event.args.value});
      } else {
        this.model_.importWarning({
          type: 'metadata_parse_error',
          message: 'Unrecognized metadata name: ' + event.name
        });
      }
    },

    processInstantEvent: function(event) {
      // V8 JIT events were logged as phase 'I' in the old format,
      // so we need to separate them out and handle specially.
      if (event.name === 'JitCodeAdded' || event.name === 'JitCodeMoved') {
        this.v8SamplingData_.push(event);
        return;
      }

      // Thread-level instant events are treated as zero-duration slices.
      if (event.s === 't' || event.s === undefined) {
        this.processDurationEvent(event);
        return;
      }

      var constructor;
      switch (event.s) {
        case 'g':
          constructor = tr.model.GlobalInstantEvent;
          break;
        case 'p':
          constructor = tr.model.ProcessInstantEvent;
          break;
        default:
          this.model_.importWarning({
            type: 'instant_parse_error',
            message: 'I phase event with unknown "s" field value.'
          });
          return;
      }

      var instantEvent = new constructor(event.cat, event.name,
          getEventColor(event), this.toModelTimeFromUs_(event.ts),
          this.deepCopyIfNeeded_(event.args));

      switch (instantEvent.type) {
        case tr.model.InstantEventType.GLOBAL:
          this.model_.instantEvents.push(instantEvent);
          break;

        case tr.model.InstantEventType.PROCESS:
          var process = this.model_.getOrCreateProcess(event.pid);
          process.instantEvents.push(instantEvent);
          break;

        default:
          throw new Error('Unknown instant event type: ' + event.s);
      }
    },

    processV8Sample: function(event) {
      var data = event.args.data;

      // As-per DevTools, the backend sometimes creates bogus samples. Skip it.
      if (data.vm_state === 'js' && !data.stack.length)
        return;

      var rootStackFrame = this.v8ProcessRootStackFrame_[event.pid];
      if (!rootStackFrame) {
        rootStackFrame = new tr.model.StackFrame(
            undefined /* parent */, 'v8-root-stack-frame' /* id */,
            'v8-root-stack-frame' /* title */, 0 /* colorId */);
        this.v8ProcessRootStackFrame_[event.pid] = rootStackFrame;
      }

      function findChildWithEntryID(stackFrame, entryID) {
        return tr.b.findFirstInArray(stackFrame.children, function(child) {
          return child.entryID === entryID;
        });
      }

      var model = this.model_;
      function addStackFrame(lastStackFrame, entry) {
        var childFrame = findChildWithEntryID(lastStackFrame, entry.id);
        if (childFrame)
          return childFrame;

        var frame = new tr.model.StackFrame(
            lastStackFrame, tr.b.GUID.allocateSimple(), entry.name,
            ColorScheme.getColorIdForGeneralPurposeString(entry.name),
            entry.sourceInfo);

        frame.entryID = entry.id;
        model.addStackFrame(frame);
        return frame;
      }

      var lastStackFrame = rootStackFrame;

      // There are several types of v8 sample events, gc, native, compiler, etc.
      // Some of these types have stacks and some don't, we handle those two
      // cases differently. For types that don't have any stack frames attached
      // we synthesize one based on the type of thing that's happening so when
      // we view all the samples we'll see something like 'external' or 'gc'
      // as a fraction of the time spent.
      if (data.stack.length > 0 && this.v8ProcessCodeMaps_[event.pid]) {
        var map = this.v8ProcessCodeMaps_[event.pid];

        // Stacks have the leaf node first, flip them around so the root
        // comes first.
        data.stack.reverse();

        for (var i = 0; i < data.stack.length; i++) {
          var entry = map.lookupEntry(data.stack[i]);
          if (entry === undefined) {
            entry = {
              id: 'unknown',
              name: 'unknown',
              sourceInfo: undefined
            };
          }

          lastStackFrame = addStackFrame(lastStackFrame, entry);
        }
      } else {
        var entry = {
          id: data.vm_state,
          name: data.vm_state,
          sourceInfo: undefined
        };
        lastStackFrame = addStackFrame(lastStackFrame, entry);
      }

      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);

      var sample = new tr.model.Sample(
          undefined /* cpu */, thread, 'V8 Sample',
          this.toModelTimeFromUs_(event.ts), lastStackFrame, 1 /* weight */,
          this.deepCopyIfNeeded_(event.args));
      this.model_.samples.push(sample);
    },

    processTraceSampleEvent: function(event) {
      if (event.name === 'V8Sample') {
        this.v8SamplingData_.push(event);
        return;
      }

      var stackFrame = this.getStackFrameForEvent_(event);
      if (stackFrame === undefined) {
        stackFrame = this.traceEventSampleStackFramesByName_[
            event.name];
      }
      if (stackFrame === undefined) {
        var id = 'te-' + tr.b.GUID.allocateSimple();
        stackFrame = new tr.model.StackFrame(
            undefined, id, event.name,
            ColorScheme.getColorIdForGeneralPurposeString(event.name));
        this.model_.addStackFrame(stackFrame);
        this.traceEventSampleStackFramesByName_[event.name] = stackFrame;
      }

      var thread = this.model_.getOrCreateProcess(event.pid)
        .getOrCreateThread(event.tid);

      var sample = new tr.model.Sample(
          undefined, thread, 'Trace Event Sample',
          this.toModelTimeFromUs_(event.ts), stackFrame, 1,
          this.deepCopyIfNeeded_(event.args));
      this.setContextsFromThread_(thread, sample);
      this.model_.samples.push(sample);
    },

    processMemoryDumpEvent: function(event) {
      if (event.ph !== 'v')
        throw new Error('Invalid memory dump event phase "' + event.ph + '".');

      var dumpId = event.id;
      if (dumpId === undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'Memory dump event (phase \'' + event.ph +
              '\') without a dump ID.'
        });
        return;
      }

      var pid = event.pid;
      if (pid === undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'Memory dump event (phase\'' + event.ph + '\', dump ID \'' +
              dumpId + '\') without a PID.'
        });
        return;
      }

      // Dump ID -> PID -> [process memory dump events].
      var allEvents = this.allMemoryDumpEvents_;

      // PID -> [process memory dump events].
      var dumpIdEvents = allEvents[dumpId];
      if (dumpIdEvents === undefined)
        allEvents[dumpId] = dumpIdEvents = {};

      // [process memory dump events].
      var processEvents = dumpIdEvents[pid];
      if (processEvents === undefined)
        dumpIdEvents[pid] = processEvents = [];

      processEvents.push(event);
    },

    processClockSyncEvent: function(event) {
      if (event.ph !== 'c')
        throw new Error('Invalid clock sync event phase "' + event.ph + '".');

      var syncId = event.args.sync_id;
      if (syncId === undefined) {
        this.model_.importWarning({
          type: 'clock_sync_parse_error',
          message: 'Clock sync at time ' + event.ts + ' without an ID.'
        });
        return;
      }

      if (event.args && event.args.issue_ts !== undefined) {
        // When Chrome is the tracing controller and is the requester of the
        // clock sync, the clock sync event looks like:
        //
        //   {
        //     "args": {
        //       "sync_id": "abc123",
        //       "issue_ts": 12340
        //     }
        //     "ph": "c"
        //     "ts": 12345
        //     ...
        //   }
        this.model_.clockSyncManager.addClockSyncMarker(
            this.clockDomainId_, syncId,
            tr.b.Unit.timestampFromUs(event.args.issue_ts),
            tr.b.Unit.timestampFromUs(event.ts));
      } else {
        // When Chrome is a tracing agent and is the recipient of the clock
        // sync request, the clock sync event looks like:
        //
        //   {
        //     "args": { "sync_id": "abc123" }
        //     "ph": "c"
        //     "ts": 12345
        //     ...
        //   }
        this.model_.clockSyncManager.addClockSyncMarker(
            this.clockDomainId_, syncId, tr.b.Unit.timestampFromUs(event.ts));
      }
    },

    // Because the order of Jit code events and V8 samples are not guaranteed,
    // We store them in an array, sort by timestamp, and then process them.
    processV8Events: function() {
      this.v8SamplingData_.sort(function(a, b) {
        if (a.ts !== b.ts)
          return a.ts - b.ts;
        if (a.ph === 'M' || a.ph === 'I')
          return -1;
        else if (b.ph === 'M' || b.ph === 'I')
          return 1;
        return 0;
      });
      var length = this.v8SamplingData_.length;
      for (var i = 0; i < length; ++i) {
        var event = this.v8SamplingData_[i];
        if (event.ph === 'M' || event.ph === 'I') {
          this.processJitCodeEvent(event);
        } else if (event.ph === 'P') {
          this.processV8Sample(event);
        }
      }
    },

    initBackcompatClockSyncEventTracker_: function(event) {
      if (event.name !== undefined &&
          event.name.startsWith(ASYNC_CLOCK_SYNC_EVENT_TITLE_PREFIX) &&
          event.ph === 'S')
        this.asyncClockSyncStart_ = event;

      if (event.name !== undefined &&
          event.name.startsWith(ASYNC_CLOCK_SYNC_EVENT_TITLE_PREFIX) &&
          event.ph === 'F')
          this.asyncClockSyncFinish_ = event;
      if (this.asyncClockSyncStart_ == undefined ||
          this.asyncClockSyncFinish_ == undefined)
        return;

      // Older version of Chrome doesn't support clock sync API, hence
      // telemetry get around it by marking the clock sync events with
      // console.time & console.timeEnd. When we encounter async events
      // with named started with 'ClockSyncEvent.' prefix, create a
      // synthetic clock sync events based on their timestamps.
      var syncId =
          this.asyncClockSyncStart_.name.substring(
              ASYNC_CLOCK_SYNC_EVENT_TITLE_PREFIX.length);
      if (syncId !==
          this.asyncClockSyncFinish_.name.substring(
              ASYNC_CLOCK_SYNC_EVENT_TITLE_PREFIX.length)) {
         throw new Error('Inconsistent clock sync id of async clock sync ' +
                         'events.');
      }
      var clockSyncEvent = {
          ph: 'c',
          args: {
            sync_id: syncId,
            issue_ts: this.asyncClockSyncStart_.ts
          },
          ts: this.asyncClockSyncFinish_.ts,
      };
      this.asyncClockSyncStart_ = undefined;
      this.asyncClockSyncFinish_ = undefined;
      return clockSyncEvent;
    },

    importClockSyncMarkers: function() {
      var asyncClockSyncStart, asyncClockSyncFinish;
      for (var i = 0; i < this.events_.length; i++) {
        var event = this.events_[i];

        var possibleBackCompatClockSyncEvent =
            this.initBackcompatClockSyncEventTracker_(event);
        if (possibleBackCompatClockSyncEvent)
            this.processClockSyncEvent(possibleBackCompatClockSyncEvent);

        if (event.ph !== 'c')
          continue;

        var eventSizeInBytes =
            this.model_.importOptions.trackDetailedModelStats ?
                JSON.stringify(event).length : undefined;

        this.model_.stats.willProcessBasicTraceEvent(
            'clock_sync', event.cat, event.name, event.ts, eventSizeInBytes);
        this.processClockSyncEvent(event);
      }
    },

    /**
     * Walks through the events_ list and outputs the structures discovered to
     * model_.
     */
    importEvents: function() {
      if (this.stackFrameEvents_)
        this.importStackFrames_(this.stackFrameEvents_, 'g');

      if (this.traceAnnotations_)
        this.importAnnotations_();

      var importOptions = this.model_.importOptions;
      var trackDetailedModelStats = importOptions.trackDetailedModelStats;

      var modelStats = this.model_.stats;

      var events = this.events_;
      for (var eI = 0; eI < events.length; eI++) {
        var event = events[eI];

        if (event.args === '__stripped__') {
          event.argsStripped = true;
          event.args = undefined;
        }

        var eventSizeInBytes;
        if (trackDetailedModelStats)
          eventSizeInBytes = JSON.stringify(event).length;
        else
          eventSizeInBytes = undefined;

        if (event.ph === 'B' || event.ph === 'E') {
          modelStats.willProcessBasicTraceEvent(
              'begin_end (non-compact)', event.cat, event.name, event.ts,
              eventSizeInBytes);
          this.processDurationEvent(event);

        } else if (event.ph === 'X') {
          modelStats.willProcessBasicTraceEvent(
              'begin_end (compact)', event.cat, event.name, event.ts,
              eventSizeInBytes);
          var slice = this.processCompleteEvent(event);
          // TODO(yuhaoz): If Chrome supports creating other events with flow,
          // we will need to call processFlowEvent for them also.
          // https://github.com/catapult-project/catapult/issues/1259
          if (slice !== undefined && event.bind_id !== undefined)
            this.processFlowEvent(event, slice);

        } else if (event.ph === 'b' || event.ph === 'e' || event.ph === 'n' ||
                   event.ph === 'S' || event.ph === 'F' || event.ph === 'T' ||
                   event.ph === 'p') {
          modelStats.willProcessBasicTraceEvent(
              'async', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processAsyncEvent(event);

        // Note, I is historic. The instant event marker got changed, but we
        // want to support loading old trace files so we have both I and i.
        } else if (event.ph === 'I' || event.ph === 'i' || event.ph === 'R') {
          modelStats.willProcessBasicTraceEvent(
              'instant', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processInstantEvent(event);

        } else if (event.ph === 'P') {
          modelStats.willProcessBasicTraceEvent(
              'samples', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processTraceSampleEvent(event);
        } else if (event.ph === 'C') {
          modelStats.willProcessBasicTraceEvent(
              'counters', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processCounterEvent(event);
        } else if (event.ph === 'M') {
          modelStats.willProcessBasicTraceEvent(
              'metadata', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processMetadataEvent(event);

        } else if (event.ph === 'N' || event.ph === 'D' || event.ph === 'O') {
          modelStats.willProcessBasicTraceEvent(
              'objects', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processObjectEvent(event);

        } else if (event.ph === 's' || event.ph === 't' || event.ph === 'f') {
          modelStats.willProcessBasicTraceEvent(
              'flows', event.cat, event.name, event.ts, eventSizeInBytes);
          this.processFlowEvent(event);

        } else if (event.ph === 'v') {
          modelStats.willProcessBasicTraceEvent(
              'memory_dumps', event.cat, event.name, event.ts,
              eventSizeInBytes);
          this.processMemoryDumpEvent(event);

        } else if (event.ph === '(' || event.ph === ')') {
          this.processContextEvent(event);
        } else if (event.ph === 'c') {
          // No-op. Clock sync events have already been processed in
          // importClockSyncMarkers().
        } else {
          modelStats.willProcessBasicTraceEvent(
              'unknown', event.cat, event.name, event.ts, eventSizeInBytes);
          this.model_.importWarning({
            type: 'parse_error',
            message: 'Unrecognized event phase: ' +
                event.ph + ' (' + event.name + ')'
          });
        }
      }
      this.processV8Events();

      // Remove all the root stack frame children as they should
      // already be added.
      tr.b.iterItems(this.v8ProcessRootStackFrame_, function(name, frame) {
        frame.removeAllChildren();
      });
    },

    importStackFrames_: function(rawStackFrames, idPrefix) {
      var model = this.model_;

      for (var id in rawStackFrames) {
        var rawStackFrame = rawStackFrames[id];
        var fullId = idPrefix + id;
        var textForColor = rawStackFrame.category ?
            rawStackFrame.category : rawStackFrame.name;
        var stackFrame = new tr.model.StackFrame(
            undefined /* parentFrame */, fullId, rawStackFrame.name,
            ColorScheme.getColorIdForGeneralPurposeString(textForColor));
        model.addStackFrame(stackFrame);
      }

      for (var id in rawStackFrames) {
        var fullId = idPrefix + id;
        var stackFrame = model.stackFrames[fullId];
        if (stackFrame === undefined)
          throw new Error('Internal error');

        var rawStackFrame = rawStackFrames[id];
        var parentId = rawStackFrame.parent;
        var parentStackFrame;
        if (parentId === undefined) {
          parentStackFrame = undefined;
        } else {
          var parentFullId = idPrefix + parentId;
          parentStackFrame = model.stackFrames[parentFullId];
          if (parentStackFrame === undefined) {
            this.model_.importWarning({
              type: 'metadata_parse_error',
              message: 'Missing parent frame with ID ' + parentFullId +
                  ' for stack frame \'' + stackFrame.name + '\' (ID ' + fullId +
                  ').'
            });
          }
        }
        stackFrame.parentFrame = parentStackFrame;
      }
    },

    importObjectTypeNameMap_: function(rawObjectTypeNameMap, pid) {
      if (pid in this.objectTypeNameMap_) {
        this.model_.importWarning({
          type: 'metadata_parse_error',
          message: 'Mapping from object type IDs to names provided for pid=' +
              pid + ' multiple times.'
        });
        return;
      }

      var objectTypeNamePrefix = undefined;
      var objectTypeNameSuffix = undefined;
      var objectTypeNameMap = {};
      for (var objectTypeId in rawObjectTypeNameMap) {
        var rawObjectTypeName = rawObjectTypeNameMap[objectTypeId];

        // If we haven't figured out yet which compiler the object type names
        // come from, we try to do it now.
        if (objectTypeNamePrefix === undefined) {
          for (var i = 0; i < OBJECT_TYPE_NAME_PATTERNS.length; i++) {
            var pattern = OBJECT_TYPE_NAME_PATTERNS[i];
            if (rawObjectTypeName.startsWith(pattern.prefix) &&
                rawObjectTypeName.endsWith(pattern.suffix)) {
              objectTypeNamePrefix = pattern.prefix;
              objectTypeNameSuffix = pattern.suffix;
              break;
            }
          }
        }

        if (objectTypeNamePrefix !== undefined &&
            rawObjectTypeName.startsWith(objectTypeNamePrefix) &&
            rawObjectTypeName.endsWith(objectTypeNameSuffix)) {
          // With compiler-specific prefix and suffix (automatically annotated
          // object types).
          objectTypeNameMap[objectTypeId] = rawObjectTypeName.substring(
               objectTypeNamePrefix.length,
               rawObjectTypeName.length - objectTypeNameSuffix.length);
        } else {
          // Without compiler-specific prefix and suffix (manually annotated
          // object types and '[unknown]').
          objectTypeNameMap[objectTypeId] = rawObjectTypeName;
        }
      }

      this.objectTypeNameMap_[pid] = objectTypeNameMap;
    },

    importAnnotations_: function() {
      for (var id in this.traceAnnotations_) {
        var annotation = tr.model.Annotation.fromDictIfPossible(
           this.traceAnnotations_[id]);
        if (!annotation) {
          this.model_.importWarning({
            type: 'annotation_warning',
            message: 'Unrecognized traceAnnotation typeName \"' +
                this.traceAnnotations_[id].typeName + '\"'
          });
          continue;
        }
        this.model_.addAnnotation(annotation);
      }
    },

    /**
     * Called by the Model after all other importers have imported their
     * events.
     */
    finalizeImport: function() {
      if (this.softwareMeasuredCpuCount_ !== undefined) {
        this.model_.kernel.softwareMeasuredCpuCount =
            this.softwareMeasuredCpuCount_;
      }
      this.createAsyncSlices_();
      this.createFlowSlices_();
      this.createExplicitObjects_();
      this.createImplicitObjects_();
      this.createMemoryDumps_();
    },

    /* Events can have one or more stack frames associated with them, but
     * that frame might be encoded either as a stack trace of program counters,
     * or as a direct stack frame reference. This handles either case and
     * if found, returns the stackframe.
     */
    getStackFrameForEvent_: function(event, opt_lookForEndEvent) {
      var sf;
      var stack;
      if (opt_lookForEndEvent) {
        sf = event.esf;
        stack = event.estack;
      } else {
        sf = event.sf;
        stack = event.stack;
      }
      if (stack !== undefined && sf !== undefined) {
        this.model_.importWarning({
          type: 'stack_frame_and_stack_error',
          message: 'Event at ' + event.ts +
              ' cannot have both a stack and a stackframe.'
        });
        return undefined;
      }

      if (stack !== undefined)
        return this.model_.resolveStackToStackFrame_(event.pid, stack);
      if (sf === undefined)
        return undefined;

      var stackFrame = this.model_.stackFrames['g' + sf];
      if (stackFrame === undefined) {
        this.model_.importWarning({
          type: 'sample_import_error',
          message: 'No frame for ' + sf
        });
        return;
      }
      return stackFrame;
    },

    resolveStackToStackFrame_: function(pid, stack) {
      // TODO(alph,fmeawad): Add codemap resolution code here.
      return undefined;
    },

    importSampleData: function() {
      if (!this.sampleEvents_)
        return;
      var m = this.model_;

      // If this is the only importer, then fake-create the threads.
      var events = this.sampleEvents_;
      if (this.events_.length === 0) {
        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          m.getOrCreateProcess(event.tid).getOrCreateThread(event.tid);
        }
      }

      var threadsByTid = {};
      m.getAllThreads().forEach(function(t) {
        threadsByTid[t.tid] = t;
      });

      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var thread = threadsByTid[event.tid];
        if (thread === undefined) {
          m.importWarning({
            type: 'sample_import_error',
            message: 'Thread ' + events.tid + 'not found'
          });
          continue;
        }

        var cpu;
        if (event.cpu !== undefined)
          cpu = m.kernel.getOrCreateCpu(event.cpu);

        var stackFrame = this.getStackFrameForEvent_(event);

        var sample = new tr.model.Sample(
            cpu, thread,
            event.name,
            this.toModelTimeFromUs_(event.ts),
            stackFrame,
            event.weight);
        m.samples.push(sample);
      }
    },

    createAsyncSlices_: function() {
      if (this.allAsyncEvents_.length === 0)
        return;

      this.allAsyncEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d !== 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var legacyEvents = [];
      // Group nestable async events by ID. Events with the same ID should
      // belong to the same parent async event.
      var nestableAsyncEventsByKey = {};
      var nestableMeasureAsyncEventsByKey = {};
      for (var i = 0; i < this.allAsyncEvents_.length; i++) {
        var asyncEventState = this.allAsyncEvents_[i];
        var event = asyncEventState.event;
        if (event.ph === 'S' || event.ph === 'F' || event.ph === 'T' ||
            event.ph === 'p') {
          legacyEvents.push(asyncEventState);
          continue;
        }
        if (event.cat === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require a ' +
                'cat parameter.'
          });
          continue;
        }

        if (event.name === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require a ' +
                'name parameter.'
          });
          continue;
        }

        if (event.id === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Nestable async events (ph: b, e, or n) require an ' +
                'id parameter.'
          });
          continue;
        }

        if (event.cat === 'blink.user_timing') {
          var matched = /([^\/:]+):([^\/:]+)\/?(.*)/.exec(event.name);
          if (matched !== null) {
            var key = matched[1] + ':' + event.cat;
            event.args = JSON.parse(Base64.atob(matched[3]) || '{}');
            if (nestableMeasureAsyncEventsByKey[key] === undefined)
              nestableMeasureAsyncEventsByKey[key] = [];
            nestableMeasureAsyncEventsByKey[key].push(asyncEventState);
            continue;
          }
        }

        var key = event.cat + ':' + event.id;
        if (nestableAsyncEventsByKey[key] === undefined)
           nestableAsyncEventsByKey[key] = [];
        nestableAsyncEventsByKey[key].push(asyncEventState);
      }
      // Handle legacy async events.
      this.createLegacyAsyncSlices_(legacyEvents);

      // Parse nestable measure async events into AsyncSlices.
      this.createNestableAsyncSlices_(nestableMeasureAsyncEventsByKey);

      // Parse nestable async events into AsyncSlices.
      this.createNestableAsyncSlices_(nestableAsyncEventsByKey);
    },

    createLegacyAsyncSlices_: function(legacyEvents) {
      if (legacyEvents.length === 0)
        return;

      legacyEvents.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var asyncEventStatesByNameThenID = {};

      for (var i = 0; i < legacyEvents.length; i++) {
        var asyncEventState = legacyEvents[i];

        var event = asyncEventState.event;
        var name = event.name;
        if (name === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Async events (ph: S, T, p, or F) require a name ' +
                ' parameter.'
          });
          continue;
        }

        var id = event.id;
        if (id === undefined) {
          this.model_.importWarning({
            type: 'async_slice_parse_error',
            message: 'Async events (ph: S, T, p, or F) require an id parameter.'
          });
          continue;
        }

        // TODO(simonjam): Add a synchronous tick on the appropriate thread.

        if (event.ph === 'S') {
          if (asyncEventStatesByNameThenID[name] === undefined)
            asyncEventStatesByNameThenID[name] = {};
          if (asyncEventStatesByNameThenID[name][id]) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', a slice of the same id ' + id +
                  ' was alrady open.'
            });
            continue;
          }
          asyncEventStatesByNameThenID[name][id] = [];
          asyncEventStatesByNameThenID[name][id].push(asyncEventState);
        } else {
          if (asyncEventStatesByNameThenID[name] === undefined) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', no slice named ' + name +
                  ' was open.'
            });
            continue;
          }
          if (asyncEventStatesByNameThenID[name][id] === undefined) {
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'At ' + event.ts + ', no slice named ' + name +
                  ' with id=' + id + ' was open.'
            });
            continue;
          }
          var events = asyncEventStatesByNameThenID[name][id];
          events.push(asyncEventState);

          if (event.ph === 'F') {
            // Create a slice from start to end.
            var asyncSliceConstructor =
               tr.model.AsyncSlice.subTypes.getConstructor(
                  events[0].event.cat,
                  name);
            var slice = new asyncSliceConstructor(
                events[0].event.cat,
                name,
                getEventColor(events[0].event),
                this.toModelTimeFromUs_(events[0].event.ts),
                tr.b.concatenateObjects(events[0].event.args,
                                      events[events.length - 1].event.args),
                this.toModelTimeFromUs_(event.ts - events[0].event.ts),
                true, undefined, undefined, events[0].event.argsStripped);
            slice.startThread = events[0].thread;
            slice.endThread = asyncEventState.thread;
            slice.id = id;

            var stepType = events[1].event.ph;
            var isValid = true;

            // Create subSlices for each step. Skip the start and finish events,
            // which are always first and last respectively.
            for (var j = 1; j < events.length - 1; ++j) {
              if (events[j].event.ph === 'T' || events[j].event.ph === 'p') {
                isValid = this.assertStepTypeMatches_(stepType, events[j]);
                if (!isValid)
                  break;
              }

              if (events[j].event.ph === 'S') {
                this.model_.importWarning({
                  type: 'async_slice_parse_error',
                  message: 'At ' + event.event.ts + ', a slice named ' +
                      event.event.name + ' with id=' + event.event.id +
                      ' had a step before the start event.'
                });
                continue;
              }

              if (events[j].event.ph === 'F') {
                this.model_.importWarning({
                  type: 'async_slice_parse_error',
                  message: 'At ' + event.event.ts + ', a slice named ' +
                      event.event.name + ' with id=' + event.event.id +
                      ' had a step after the finish event.'
                });
                continue;
              }

              var startIndex = j + (stepType === 'T' ? 0 : -1);
              var endIndex = startIndex + 1;

              var subName = events[j].event.name;
              if (!events[j].event.argsStripped &&
                  (events[j].event.ph === 'T' || events[j].event.ph === 'p'))
                subName = subName + ':' + events[j].event.args.step;

              var asyncSliceConstructor =
                 tr.model.AsyncSlice.subTypes.getConstructor(
                    events[0].event.cat,
                    subName);
              var subSlice = new asyncSliceConstructor(
                  events[0].event.cat,
                  subName,
                  getEventColor(event, subName + j),
                  this.toModelTimeFromUs_(events[startIndex].event.ts),
                  this.deepCopyIfNeeded_(events[j].event.args),
                  this.toModelTimeFromUs_(
                    events[endIndex].event.ts - events[startIndex].event.ts),
                      undefined, undefined,
                      events[startIndex].event.argsStripped);
              subSlice.startThread = events[startIndex].thread;
              subSlice.endThread = events[endIndex].thread;
              subSlice.id = id;

              slice.subSlices.push(subSlice);
            }

            if (isValid) {
              // Add |slice| to the start-thread's asyncSlices.
              slice.startThread.asyncSliceGroup.push(slice);
            }

            delete asyncEventStatesByNameThenID[name][id];
          }
        }
      }
    },

    createNestableAsyncSlices_: function(nestableEventsByKey) {
      for (var key in nestableEventsByKey) {
        var eventStateEntries = nestableEventsByKey[key];
        // Stack of enclosing BEGIN events.
        var parentStack = [];
        for (var i = 0; i < eventStateEntries.length; ++i) {
          var eventStateEntry = eventStateEntries[i];
          // If this is the end of an event, match it to the start.
          if (eventStateEntry.event.ph === 'e') {
            // Walk up the parent stack to find the corresponding BEGIN for
            // this END.
            var parentIndex = -1;
            for (var k = parentStack.length - 1; k >= 0; --k) {
              if (parentStack[k].event.name === eventStateEntry.event.name) {
                parentIndex = k;
                break;
              }
            }
            if (parentIndex === -1) {
              // Unmatched end.
              eventStateEntry.finished = false;
            } else {
              parentStack[parentIndex].end = eventStateEntry;
              // Pop off all enclosing unmatched BEGINs util parentIndex.
              while (parentIndex < parentStack.length) {
                parentStack.pop();
              }
            }
          }
          // Inherit the current parent.
          if (parentStack.length > 0)
            eventStateEntry.parentEntry = parentStack[parentStack.length - 1];
          if (eventStateEntry.event.ph === 'b') {
            parentStack.push(eventStateEntry);
          }
        }
        var topLevelSlices = [];
        for (var i = 0; i < eventStateEntries.length; ++i) {
          var eventStateEntry = eventStateEntries[i];
          // Skip matched END, as its slice will be created when we
          // encounter its corresponding BEGIN.
          if (eventStateEntry.event.ph === 'e' &&
              eventStateEntry.finished === undefined) {
            continue;
          }
          var startState = undefined;
          var endState = undefined;
          var sliceArgs = eventStateEntry.event.args || {};
          var sliceError = undefined;
          if (eventStateEntry.event.ph === 'n') {
            startState = eventStateEntry;
            endState = eventStateEntry;
          } else if (eventStateEntry.event.ph === 'b') {
            if (eventStateEntry.end === undefined) {
              // Unmatched BEGIN. End it when last event with this ID ends.
              eventStateEntry.end =
                eventStateEntries[eventStateEntries.length - 1];
              sliceError =
                'Slice has no matching END. End time has been adjusted.';
              this.model_.importWarning({
                type: 'async_slice_parse_error',
                message: 'Nestable async BEGIN event at ' +
                  eventStateEntry.event.ts + ' with name=' +
                  eventStateEntry.event.name +
                  ' and id=' + eventStateEntry.event.id + ' was unmatched.'
              });
            } else {
              // Include args for both END and BEGIN for a matched pair.
              function concatenateArguments(args1, args2) {
                if (args1.params === undefined || args2.params === undefined)
                  return tr.b.concatenateObjects(args1, args2);
                // Make an argument object to hold the combined params.
                var args3 = {};
                args3.params = tr.b.concatenateObjects(args1.params,
                                                       args2.params);
                return tr.b.concatenateObjects(args1, args2, args3);
              }
              var endArgs = eventStateEntry.end.event.args || {};
              sliceArgs = concatenateArguments(sliceArgs, endArgs);
            }
            startState = eventStateEntry;
            endState = eventStateEntry.end;
          } else {
            // Unmatched END. Start it at the first event with this ID starts.
            sliceError =
              'Slice has no matching BEGIN. Start time has been adjusted.';
            this.model_.importWarning({
              type: 'async_slice_parse_error',
              message: 'Nestable async END event at ' +
                eventStateEntry.event.ts + ' with name=' +
                eventStateEntry.event.name +
                ' and id=' + eventStateEntry.event.id + ' was unmatched.'
            });
            startState = eventStateEntries[0];
            endState = eventStateEntry;
          }

          var isTopLevel = (eventStateEntry.parentEntry === undefined);
          var asyncSliceConstructor =
              tr.model.AsyncSlice.subTypes.getConstructor(
                eventStateEntry.event.cat,
                eventStateEntry.event.name);

          var threadStart = undefined;
          var threadDuration = undefined;
          if (startState.event.tts && startState.event.use_async_tts) {
            threadStart = this.toModelTimeFromUs_(startState.event.tts);
            if (endState.event.tts) {
              var threadEnd = this.toModelTimeFromUs_(endState.event.tts);
              threadDuration = threadEnd - threadStart;
            }
          }

          var slice = new asyncSliceConstructor(
            eventStateEntry.event.cat,
            eventStateEntry.event.name,
            getEventColor(endState.event),
            this.toModelTimeFromUs_(startState.event.ts),
            sliceArgs,
            this.toModelTimeFromUs_(endState.event.ts - startState.event.ts),
            isTopLevel,
            threadStart,
            threadDuration,
            startState.event.argsStripped);

          slice.startThread = startState.thread;
          slice.endThread = endState.thread;

          slice.startStackFrame = this.getStackFrameForEvent_(startState.event);
          slice.endStackFrame = this.getStackFrameForEvent_(endState.event);

          slice.id = key;
          if (sliceError !== undefined)
            slice.error = sliceError;
          eventStateEntry.slice = slice;
          // Add the slice to the topLevelSlices array if there is no parent.
          // Otherwise, add the slice to the subSlices of its parent.
          if (isTopLevel) {
            topLevelSlices.push(slice);
          } else if (eventStateEntry.parentEntry.slice !== undefined) {
            eventStateEntry.parentEntry.slice.subSlices.push(slice);
          }
        }
        for (var si = 0; si < topLevelSlices.length; si++) {
          topLevelSlices[si].startThread.asyncSliceGroup.push(
            topLevelSlices[si]);
        }
      }
    },

    assertStepTypeMatches_: function(stepType, event) {
      if (stepType != event.event.ph) {
        this.model_.importWarning({
          type: 'async_slice_parse_error',
          message: 'At ' + event.event.ts + ', a slice named ' +
              event.event.name + ' with id=' + event.event.id +
              ' had both begin and end steps, which is not allowed.'
        });
        return false;
      }
      return true;
    },

    createFlowSlices_: function() {
      if (this.allFlowEvents_.length === 0)
        return;

      var that = this;

      function validateFlowEvent() {
        if (event.name === undefined) {
          that.model_.importWarning({
            type: 'flow_slice_parse_error',
            message: 'Flow events (ph: s, t or f) require a name parameter.'
          });
          return false;
        }

        // Support Flow API v1.
        if (event.ph === 's' || event.ph === 'f' || event.ph === 't') {
          if (event.id === undefined) {
            that.model_.importWarning({
              type: 'flow_slice_parse_error',
              message: 'Flow events (ph: s, t or f) require an id parameter.'
            });
            return false;
          }
          return true;
        }

        // Support Flow API v2.
        if (event.bind_id) {
          if (event.flow_in === undefined && event.flow_out === undefined) {
            that.model_.importWarning({
              type: 'flow_slice_parse_error',
              message: 'Flow producer or consumer require flow_in or flow_out.'
            });
            return false;
          }
          return true;
        }

        return false;
      }

      var createFlowEvent = function(thread, event, opt_slice) {
        var startSlice, flowId, flowStartTs;

        if (event.bind_id) {
          // Support Flow API v2.
          startSlice = opt_slice;
          flowId = event.bind_id;
          flowStartTs = this.toModelTimeFromUs_(event.ts + event.dur);
        } else {
          // Support Flow API v1.
          var ts = this.toModelTimeFromUs_(event.ts);
          startSlice = thread.sliceGroup.findSliceAtTs(ts);
          if (startSlice === undefined)
            return undefined;
          flowId = event.id;
          flowStartTs = ts;
        }

        var flowEvent = new tr.model.FlowEvent(
            event.cat,
            flowId,
            event.name,
            getEventColor(event),
            flowStartTs,
            that.deepCopyAlways_(event.args));
        flowEvent.startSlice = startSlice;
        flowEvent.startStackFrame = that.getStackFrameForEvent_(event);
        flowEvent.endStackFrame = undefined;
        startSlice.outFlowEvents.push(flowEvent);
        return flowEvent;
      }.bind(this);

      var finishFlowEventWith = function(
          flowEvent, thread, event, refGuid, bindToParent, opt_slice) {
        var endSlice;

        if (event.bind_id) {
          // Support Flow API v2.
          endSlice = opt_slice;
        } else {
          // Support Flow API v1.
          var ts = this.toModelTimeFromUs_(event.ts);
          if (bindToParent) {
            endSlice = thread.sliceGroup.findSliceAtTs(ts);
          } else {
            endSlice = thread.sliceGroup.findNextSliceAfter(ts, refGuid);
          }
          if (endSlice === undefined)
            return false;
        }

        endSlice.inFlowEvents.push(flowEvent);
        flowEvent.endSlice = endSlice;
        flowEvent.duration =
            this.toModelTimeFromUs_(event.ts) - flowEvent.start;
        flowEvent.endStackFrame = that.getStackFrameForEvent_(event);
        that.mergeArgsInto_(flowEvent.args, event.args, flowEvent.title);
        return true;
      }.bind(this);

      function processFlowConsumer(
          flowIdToEvent, sliceGuidToEvent, event, slice) {
        var flowEvent = flowIdToEvent[event.bind_id];
        if (flowEvent === undefined) {
          that.model_.importWarning({
              type: 'flow_slice_ordering_error',
              message: 'Flow consumer ' + event.bind_id + ' does not have ' +
                  'a flow producer'});
          return false;
        } else if (flowEvent.endSlice) {
          // One flow producer can have more than one flow consumers.
          // In this case, create a new flow event using the flow producer.
          var flowProducer = flowEvent.startSlice;
          flowEvent = createFlowEvent(undefined,
              sliceGuidToEvent[flowProducer.guid], flowProducer);
        }

        var ok = finishFlowEventWith(flowEvent, undefined, event,
                                     refGuid, undefined, slice);
        if (ok) {
          that.model_.flowEvents.push(flowEvent);
        } else {
          that.model_.importWarning({
              type: 'flow_slice_end_error',
              message: 'Flow consumer ' + event.bind_id + ' does not end ' +
                  'at an actual slice, so cannot be created.'});
          return false;
        }

        return true;
      }

      function processFlowProducer(flowIdToEvent, flowStatus, event, slice) {
        if (flowIdToEvent[event.bind_id] &&
            flowStatus[event.bind_id]) {
          // Can't open the same flow again while it's still open.
          // This is essentially the multi-producer case which we don't support
          that.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'Flow producer ' + event.bind_id + ' already seen'});
          return false;
        }

        var flowEvent = createFlowEvent(undefined, event, slice);
        if (!flowEvent) {
          that.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'Flow producer ' + event.bind_id + ' does not start' +
                  'a flow'});
          return false;
        }
        flowIdToEvent[event.bind_id] = flowEvent;
      }

      // Actual import.
      this.allFlowEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var flowIdToEvent = {};
      var sliceGuidToEvent = {};
      var flowStatus = {}; // true: open; false: closed.
      for (var i = 0; i < this.allFlowEvents_.length; ++i) {
        var data = this.allFlowEvents_[i];
        var refGuid = data.refGuid;
        var event = data.event;
        var thread = data.thread;
        if (!validateFlowEvent(event))
          continue;

        // Support for Flow API v2.
        if (event.bind_id) {
          var slice = data.slice;
          sliceGuidToEvent[slice.guid] = event;

          if (event.flowPhase === PRODUCER) {
            if (!processFlowProducer(flowIdToEvent, flowStatus, event, slice))
              continue;
            flowStatus[event.bind_id] = true; // open the flow.
          }
          else {
            if (!processFlowConsumer(flowIdToEvent, sliceGuidToEvent,
                event, slice))
              continue;
            flowStatus[event.bind_id] = false; // close the flow.

            if (event.flowPhase === STEP) {
              if (!processFlowProducer(flowIdToEvent, flowStatus,
                  event, slice))
                continue;
              flowStatus[event.bind_id] = true; // open the flow again.
            }
          }
          continue;
        }

        // Support for Flow API v1.
        var flowEvent;
        if (event.ph === 's') {
          if (flowIdToEvent[event.id]) {
            this.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'event id ' + event.id + ' already seen when ' +
                  'encountering start of flow event.'});
            continue;
          }
          flowEvent = createFlowEvent(thread, event);
          if (!flowEvent) {
            this.model_.importWarning({
              type: 'flow_slice_start_error',
              message: 'event id ' + event.id + ' does not start ' +
                  'at an actual slice, so cannot be created.'});
            continue;
          }
          flowIdToEvent[event.id] = flowEvent;

        } else if (event.ph === 't' || event.ph === 'f') {
          flowEvent = flowIdToEvent[event.id];
          if (flowEvent === undefined) {
            this.model_.importWarning({
              type: 'flow_slice_ordering_error',
              message: 'Found flow phase ' + event.ph + ' for id: ' + event.id +
                  ' but no flow start found.'
            });
            continue;
          }

          var bindToParent = event.ph === 't';

          if (event.ph === 'f') {
            if (event.bp === undefined) {
              // TODO(yuhaoz): In flow V2, there is no notion of binding point.
              // Removal of binding point is tracked in
              // https://github.com/google/trace-viewer/issues/991.
              if (event.cat.indexOf('input') > -1)
                bindToParent = true;
              else if (event.cat.indexOf('ipc.flow') > -1)
                bindToParent = true;
            } else {
              if (event.bp !== 'e') {
                this.model_.importWarning({
                 type: 'flow_slice_bind_point_error',
                 message: 'Flow event with invalid binding point (event.bp).'
                });
                continue;
              }
              bindToParent = true;
            }
          }

          var ok = finishFlowEventWith(flowEvent, thread, event,
                                       refGuid, bindToParent);
          if (ok) {
            that.model_.flowEvents.push(flowEvent);
          } else {
            this.model_.importWarning({
              type: 'flow_slice_end_error',
              message: 'event id ' + event.id + ' does not end ' +
                  'at an actual slice, so cannot be created.'});
          }
          flowIdToEvent[event.id] = undefined;

          // If this is a step, then create another flow event.
          if (ok && event.ph === 't') {
            flowEvent = createFlowEvent(thread, event);
            flowIdToEvent[event.id] = flowEvent;
          }
        }
      }
    },

    /**
     * This function creates objects described via the N, D, and O phase
     * events.
     */
    createExplicitObjects_: function() {
      if (this.allObjectEvents_.length === 0)
        return;

      var processEvent = function(objectEventState) {
        var event = objectEventState.event;
        var scopedId = this.scopedIdForEvent_(event);
        var thread = objectEventState.thread;
        if (event.name === undefined) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: 'While processing ' + JSON.stringify(event) + ': ' +
                'Object events require an name parameter.'
          });
        }

        if (scopedId.id === undefined) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: 'While processing ' + JSON.stringify(event) + ': ' +
                'Object events require an id parameter.'
          });
        }
        var process = thread.parent;
        var ts = this.toModelTimeFromUs_(event.ts);
        var instance;
        if (event.ph === 'N') {
          try {
            instance = process.objects.idWasCreated(
                scopedId, event.cat, event.name, ts);
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing create of ' +
                  scopedId + ' at ts=' + ts + ': ' + e
            });
            return;
          }
        } else if (event.ph === 'O') {
          if (event.args.snapshot === undefined) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing ' + scopedId + ' at ts=' + ts + ': ' +
                  'Snapshots must have args: {snapshot: ...}'
            });
            return;
          }
          var snapshot;
          try {
            var args = this.deepCopyIfNeeded_(event.args.snapshot);
            var cat;
            if (args.cat) {
              cat = args.cat;
              delete args.cat;
            } else {
              cat = event.cat;
            }

            var baseTypename;
            if (args.base_type) {
              baseTypename = args.base_type;
              delete args.base_type;
            } else {
              baseTypename = undefined;
            }
            snapshot = process.objects.addSnapshot(
                scopedId, cat, event.name, ts, args, baseTypename);
            snapshot.snapshottedOnThread = thread;
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing snapshot of ' +
                  scopedId + ' at ts=' + ts + ': ' + e
            });
            return;
          }
          instance = snapshot.objectInstance;
        } else if (event.ph === 'D') {
          try {
            process.objects.idWasDeleted(scopedId, event.cat, event.name, ts);
            var instanceMap = process.objects.getOrCreateInstanceMap_(scopedId);
            instance = instanceMap.lastInstance;
          } catch (e) {
            this.model_.importWarning({
              type: 'object_parse_error',
              message: 'While processing delete of ' +
                  scopedId + ' at ts=' + ts + ': ' + e
            });
            return;
          }
        }

        if (instance)
          instance.colorId = getEventColor(event, instance.typeName);
      }.bind(this);

      this.allObjectEvents_.sort(function(x, y) {
        var d = x.event.ts - y.event.ts;
        if (d != 0)
          return d;
        return x.sequenceNumber - y.sequenceNumber;
      });

      var allObjectEvents = this.allObjectEvents_;
      for (var i = 0; i < allObjectEvents.length; i++) {
        var objectEventState = allObjectEvents[i];
        try {
          processEvent.call(this, objectEventState);
        } catch (e) {
          this.model_.importWarning({
            type: 'object_parse_error',
            message: e.message
          });
        }
      }
    },

    createImplicitObjects_: function() {
      tr.b.iterItems(this.model_.processes, function(pid, process) {
        this.createImplicitObjectsForProcess_(process);
      }, this);
    },

    // Here, we collect all the snapshots that internally contain a
    // Javascript-level object inside their args list that has an "id" field,
    // and turn that into a snapshot of the instance referred to by id.
    createImplicitObjectsForProcess_: function(process) {

      function processField(referencingObject,
                            referencingObjectFieldName,
                            referencingObjectFieldValue,
                            containingSnapshot) {
        if (!referencingObjectFieldValue)
          return;

        if (referencingObjectFieldValue instanceof
            tr.model.ObjectSnapshot)
          return null;
        if (referencingObjectFieldValue.id === undefined)
          return;

        var implicitSnapshot = referencingObjectFieldValue;

        var rawId = implicitSnapshot.id;
        var m = /(.+)\/(.+)/.exec(rawId);
        if (!m)
          throw new Error('Implicit snapshots must have names.');
        delete implicitSnapshot.id;
        var name = m[1];
        var id = m[2];
        var res;

        var cat;
        if (implicitSnapshot.cat !== undefined)
          cat = implicitSnapshot.cat;
        else
          cat = containingSnapshot.objectInstance.category;

        var baseTypename;
        if (implicitSnapshot.base_type)
          baseTypename = implicitSnapshot.base_type;
        else
          baseTypename = undefined;

        var scope = containingSnapshot.objectInstance.scopedId.scope;

        try {
          res = process.objects.addSnapshot(
              new tr.model.ScopedId(scope, id), cat,
              name, containingSnapshot.ts,
              implicitSnapshot, baseTypename);
        } catch (e) {
          this.model_.importWarning({
            type: 'object_snapshot_parse_error',
            message: 'While processing implicit snapshot of ' +
                rawId + ' at ts=' + containingSnapshot.ts + ': ' + e
          });
          return;
        }
        res.objectInstance.hasImplicitSnapshots = true;
        res.containingSnapshot = containingSnapshot;
        res.snapshottedOnThread = containingSnapshot.snapshottedOnThread;
        referencingObject[referencingObjectFieldName] = res;
        if (!(res instanceof tr.model.ObjectSnapshot))
          throw new Error('Created object must be instanceof snapshot');
        return res.args;
      }

      /**
       * Iterates over the fields in the object, calling func for every
       * field/value found.
       *
       * @return {object} If the function does not want the field's value to be
       * iterated, return null. If iteration of the field value is desired, then
       * return either undefined (if the field value did not change) or the new
       * field value if it was changed.
       */
      function iterObject(object, func, containingSnapshot, thisArg) {
        if (!(object instanceof Object))
          return;

        if (object instanceof Array) {
          for (var i = 0; i < object.length; i++) {
            var res = func.call(thisArg, object, i, object[i],
                                containingSnapshot);
            if (res === null)
              continue;
            if (res)
              iterObject(res, func, containingSnapshot, thisArg);
            else
              iterObject(object[i], func, containingSnapshot, thisArg);
          }
          return;
        }

        for (var key in object) {
          var res = func.call(thisArg, object, key, object[key],
                              containingSnapshot);
          if (res === null)
            continue;
          if (res)
            iterObject(res, func, containingSnapshot, thisArg);
          else
            iterObject(object[key], func, containingSnapshot, thisArg);
        }
      }

      // TODO(nduca): We may need to iterate the instances in sorted order by
      // creationTs.
      process.objects.iterObjectInstances(function(instance) {
        instance.snapshots.forEach(function(snapshot) {
          if (snapshot.args.id !== undefined)
            throw new Error('args cannot have an id field inside it');
          iterObject(snapshot.args, processField, snapshot, this);
        }, this);
      }, this);
    },

    createMemoryDumps_: function() {
      for (var dumpId in this.allMemoryDumpEvents_)
        this.createGlobalMemoryDump_(this.allMemoryDumpEvents_[dumpId], dumpId);
    },

    createGlobalMemoryDump_: function(dumpIdEvents, dumpId) {
      // 1. Create a GlobalMemoryDump for the provided process memory dump
      // the events, all of which have the same dump ID.

      // Calculate the range of the global memory dump.
      var globalRange = new tr.b.Range();
      for (var pid in dumpIdEvents) {
        var processEvents = dumpIdEvents[pid];
        for (var i = 0; i < processEvents.length; i++)
          globalRange.addValue(this.toModelTimeFromUs_(processEvents[i].ts));
      }
      if (globalRange.isEmpty)
        throw new Error('Internal error: Global memory dump without events');

      // Create the global memory dump.
      var globalMemoryDump = new tr.model.GlobalMemoryDump(
          this.model_, globalRange.min);
      globalMemoryDump.duration = globalRange.range;
      this.model_.globalMemoryDumps.push(globalMemoryDump);

      var globalMemoryAllocatorDumpsByFullName = {};
      var levelsOfDetail = {};
      var allMemoryAllocatorDumpsByGuid = {};

      // 2. Create a ProcessMemoryDump for each PID in the provided process
      // memory dump events. Everything except for edges between memory
      // allocator dumps is parsed from the process memory dump trace events at
      // this step.
      for (var pid in dumpIdEvents) {
        this.createProcessMemoryDump_(globalMemoryDump,
            globalMemoryAllocatorDumpsByFullName, levelsOfDetail,
            allMemoryAllocatorDumpsByGuid, dumpIdEvents[pid], pid, dumpId);
      }

      // 3. Set the level of detail and memory allocator dumps of the
      // GlobalMemoryDump, which come from the process memory dump trace
      // events parsed in the prebvious step.
      globalMemoryDump.levelOfDetail = levelsOfDetail.global;

      // Find the root allocator dumps and establish the parent links of
      // the global memory dump.
      globalMemoryDump.memoryAllocatorDumps =
          this.inferMemoryAllocatorDumpTree_(
              globalMemoryAllocatorDumpsByFullName);

      // 4. Finally, parse the edges between all memory allocator dumps within
      // the GlobalMemoryDump. This can only be done once all memory allocator
      // dumps have been parsed (i.e. it is necessary to iterate over the
      // process memory dump trace events once more).
      this.parseMemoryDumpAllocatorEdges_(allMemoryAllocatorDumpsByGuid,
          dumpIdEvents, dumpId);
    },

    createProcessMemoryDump_: function(globalMemoryDump,
        globalMemoryAllocatorDumpsByFullName, levelsOfDetail,
        allMemoryAllocatorDumpsByGuid, processEvents, pid, dumpId) {
      // Calculate the range of the process memory dump.
      var processRange = new tr.b.Range();
      for (var i = 0; i < processEvents.length; i++)
        processRange.addValue(this.toModelTimeFromUs_(processEvents[i].ts));
      if (processRange.isEmpty)
        throw new Error('Internal error: Process memory dump without events');

      // Create the process memory dump.
      var process = this.model_.getOrCreateProcess(pid);
      var processMemoryDump = new tr.model.ProcessMemoryDump(
          globalMemoryDump, process, processRange.min);
      processMemoryDump.duration = processRange.range;
      process.memoryDumps.push(processMemoryDump);
      globalMemoryDump.processMemoryDumps[pid] = processMemoryDump;

      var processMemoryAllocatorDumpsByFullName = {};

      // Parse all process memory dump trace events for the newly created
      // ProcessMemoryDump.
      for (var i = 0; i < processEvents.length; i++) {
        var processEvent = processEvents[i];

        var dumps = processEvent.args.dumps;
        if (dumps === undefined) {
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: '\'dumps\' field not found in a process memory dump' +
                ' event for PID=' + pid + ' and dump ID=' + dumpId + '.'
          });
          continue;
        }

        // Totals, VM regions, and heap dumps for the newly created
        // ProcessMemoryDump should be present in at most one event, so they
        // can be added to the ProcessMemoryDump immediately.
        this.parseMemoryDumpTotals_(processMemoryDump, dumps, pid, dumpId);
        this.parseMemoryDumpVmRegions_(processMemoryDump, dumps, pid, dumpId);
        this.parseMemoryDumpHeapDumps_(processMemoryDump, dumps, pid, dumpId);

        // All process memory dump trace events for the newly created
        // ProcessMemoryDump must be processed before level of detail and
        // allocator dumps can be added to it.
        this.parseMemoryDumpLevelOfDetail_(levelsOfDetail, dumps, pid,
            dumpId);
        this.parseMemoryDumpAllocatorDumps_(processMemoryDump, globalMemoryDump,
            processMemoryAllocatorDumpsByFullName,
            globalMemoryAllocatorDumpsByFullName,
            allMemoryAllocatorDumpsByGuid, dumps, pid, dumpId);
      }

      if (levelsOfDetail.process === undefined) {
        // Infer level of detail from the presence of VM regions in legacy
        // traces (where raw process memory dump events don't contain the
        // level_of_detail field). These traces will not have BACKGROUND mode.
        levelsOfDetail.process = processMemoryDump.vmRegions ? DETAILED : LIGHT;
      }
      if (!this.updateMemoryDumpLevelOfDetail_(
          levelsOfDetail, 'global', levelsOfDetail.process)) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'diffent levels of detail provided for global memory' +
              ' dump (dump ID=' + dumpId + ').'
        });
      }
      processMemoryDump.levelOfDetail = levelsOfDetail.process;
      delete levelsOfDetail.process;  // Reused for all process dumps.

      // Find the root allocator dumps and establish the parent links of
      // the process memory dump.
      processMemoryDump.memoryAllocatorDumps =
          this.inferMemoryAllocatorDumpTree_(
              processMemoryAllocatorDumpsByFullName);
    },

    parseMemoryDumpTotals_: function(processMemoryDump, dumps, pid, dumpId) {
      var rawTotals = dumps.process_totals;
      if (rawTotals === undefined)
        return;

      if (processMemoryDump.totals !== undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'Process totals provided multiple times for' +
              ' process memory dump for PID=' + pid +
              ' and dump ID=' + dumpId + '.'
        });
        return;
      }

      var totals = {};
      var platformSpecificTotals = undefined;

      for (var rawTotalName in rawTotals) {
        var rawTotalValue = rawTotals[rawTotalName];
        if (rawTotalValue === undefined)
          continue;

        // Total resident bytes.
        if (rawTotalName === 'resident_set_bytes') {
          totals.residentBytes = parseInt(rawTotalValue, 16);
          continue;
        }

        // Peak resident bytes.
        if (rawTotalName === 'peak_resident_set_bytes') {
          totals.peakResidentBytes = parseInt(rawTotalValue, 16);
          continue;
        }
        if (rawTotalName === 'is_peak_rss_resetable') {
          totals.arePeakResidentBytesResettable = !!rawTotalValue;
          continue;
        }

        // OS-specific totals (e.g. private resident on Mac).
        if (platformSpecificTotals === undefined) {
          platformSpecificTotals = {};
          totals.platformSpecific = platformSpecificTotals;
        }
        platformSpecificTotals[rawTotalName] = parseInt(rawTotalValue, 16);
      }

      // Either both peak_resident_set_bytes and is_peak_rss_resetable should
      // be present in the trace, or neither.
      if (totals.peakResidentBytes === undefined &&
          totals.arePeakResidentBytesResettable !== undefined) {
        this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Optional field peak_resident_set_bytes found' +
                ' but is_peak_rss_resetable not found in' +
                ' process memory dump for PID=' + pid +
                ' and dump ID=' + dumpId + '.'
        });
      }
      if (totals.arePeakResidentBytesResettable !== undefined &&
          totals.peakResidentBytes === undefined) {
        this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Optional field is_peak_rss_resetable found' +
                ' but peak_resident_set_bytes not found in' +
                ' process memory dump for PID=' + pid +
                ' and dump ID=' + dumpId + '.'
        });
      }

      processMemoryDump.totals = totals;
    },

    parseMemoryDumpVmRegions_: function(processMemoryDump, dumps, pid, dumpId) {
      var rawProcessMmaps = dumps.process_mmaps;
      if (rawProcessMmaps === undefined)
        return;

      var rawVmRegions = rawProcessMmaps.vm_regions;
      if (rawVmRegions === undefined)
        return;

      if (processMemoryDump.vmRegions !== undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'VM regions provided multiple times for' +
              ' process memory dump for PID=' + pid +
              ' and dump ID=' + dumpId + '.'
        });
        return;
      }

      // See //base/trace_event/process_memory_maps.cc in Chromium.
      var vmRegions = new Array(rawVmRegions.length);
      for (var i = 0; i < rawVmRegions.length; i++) {
        var rawVmRegion = rawVmRegions[i];

        var byteStats = {};
        var rawByteStats = rawVmRegion.bs;
        for (var rawByteStatName in rawByteStats) {
          var rawByteStatValue = rawByteStats[rawByteStatName];
          if (rawByteStatValue === undefined) {
            this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'Byte stat \'' + rawByteStatName + '\' of VM region ' +
                  i + ' (' + rawVmRegion.mf + ') in process memory dump for ' +
                  'PID=' + pid + ' and dump ID=' + dumpId +
                  ' does not have a value.'
            });
            continue;
          }
          var byteStatName = BYTE_STAT_NAME_MAP[rawByteStatName];
          if (byteStatName === undefined) {
            this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'Unknown byte stat name \'' + rawByteStatName + '\' (' +
                  rawByteStatValue + ') of VM region ' + i + ' (' +
                  rawVmRegion.mf + ') in process memory dump for PID=' + pid +
                  ' and dump ID=' + dumpId + '.'
            });
            continue;
          }
          byteStats[byteStatName] = parseInt(rawByteStatValue, 16);
        }

        vmRegions[i] = new tr.model.VMRegion(
            parseInt(rawVmRegion.sa, 16),  // startAddress
            parseInt(rawVmRegion.sz, 16),  // sizeInBytes
            rawVmRegion.pf,  // protectionFlags
            rawVmRegion.mf,  // mappedFile
            byteStats);
      }

      processMemoryDump.vmRegions =
          tr.model.VMRegionClassificationNode.fromRegions(vmRegions);
    },

    parseMemoryDumpHeapDumps_: function(processMemoryDump, dumps, pid, dumpId) {
      var rawHeapDumps = dumps.heaps;
      if (rawHeapDumps === undefined)
        return;

      if (processMemoryDump.heapDumps !== undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'Heap dumps provided multiple times for' +
              ' process memory dump for PID=' + pid +
              ' and dump ID=' + dumpId + '.'
        });
        return;
      }

      var model = this.model_;
      var idPrefix = 'p' + pid + ':';
      var heapDumps = {};

      var objectTypeNameMap = this.objectTypeNameMap_[pid];
      if (objectTypeNameMap === undefined) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'Missing mapping from object type IDs to names.'
        });
      }

      for (var allocatorName in rawHeapDumps) {
        var entries = rawHeapDumps[allocatorName].entries;
        if (entries === undefined || entries.length === 0) {
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'No heap entries in a ' + allocatorName +
                ' heap dump for PID=' + pid + ' and dump ID=' + dumpId + '.'
          });
          continue;
        }

        // The old format always starts with a {size: <total>} entry.
        // See https://goo.gl/WYStil
        // TODO(petrcermak): Remove support for the old format once the new
        // format has been around long enough.
        var isOldFormat = entries[0].bt === undefined;
        if (!isOldFormat && objectTypeNameMap === undefined) {
          // Mapping from object type IDs to names must be provided in the new
          // format.
          continue;
        }

        var heapDump = new tr.model.HeapDump(processMemoryDump, allocatorName);

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var leafStackFrameIndex = entry.bt;
          var leafStackFrame;

          // There are two possible mappings from leaf stack frame indices
          // (provided in the trace) to the corresponding stack frames
          // depending on the format.
          if (isOldFormat) {
            // Old format:
            //   Undefined index        -> / (root)
            //   Defined index for /A/B -> /A/B/<self>
            if (leafStackFrameIndex === undefined) {
              leafStackFrame = undefined /* root */;
            } else {
              // Get the leaf stack frame corresponding to the provided index.
              var leafStackFrameId = idPrefix + leafStackFrameIndex;
              if (leafStackFrameIndex === '') {
                leafStackFrame = undefined /* root */;
              } else {
                leafStackFrame = model.stackFrames[leafStackFrameId];
                if (leafStackFrame === undefined) {
                  this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Missing leaf stack frame (ID ' +
                        leafStackFrameId + ') of heap entry ' + i + ' (size ' +
                        size + ') in a ' + allocatorName +
                        ' heap dump for PID=' + pid + '.'
                  });
                  continue;
                }
              }

              // Inject an artificial <self> leaf stack frame.
              leafStackFrameId += ':self';
              if (model.stackFrames[leafStackFrameId] !== undefined) {
                // The frame might already exist if there are multiple process
                // memory dumps (for the same process) in the trace.
                leafStackFrame = model.stackFrames[leafStackFrameId];
              } else {
                leafStackFrame = new tr.model.StackFrame(
                    leafStackFrame, leafStackFrameId, '<self>',
                    undefined /* colorId */);
                model.addStackFrame(leafStackFrame);
              }
            }
          } else {
            // New format:
            //   Undefined index        -> (invalid value)
            //   Defined index for /A/B -> /A/B
            if (leafStackFrameIndex === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Missing stack frame ID of heap entry ' + i +
                    ' (size ' + size + ') in a ' + allocatorName +
                    ' heap dump for PID=' + pid + '.'
              });
              continue;
            }

            // Get the leaf stack frame corresponding to the provided index.
            var leafStackFrameId = idPrefix + leafStackFrameIndex;
            if (leafStackFrameIndex === '') {
              leafStackFrame = undefined /* root */;
            } else {
              leafStackFrame = model.stackFrames[leafStackFrameId];
              if (leafStackFrame === undefined) {
                this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Missing leaf stack frame (ID ' + leafStackFrameId +
                      ') of heap entry ' + i + ' (size ' + size + ') in a ' +
                      allocatorName + ' heap dump for PID=' + pid + '.'
                });
                continue;
              }
            }
          }

          var objectTypeId = entry.type;
          var objectTypeName;
          if (objectTypeId === undefined) {
            objectTypeName = undefined /* total over all types */;
          } else if (objectTypeNameMap === undefined) {
            // This can only happen when the old format is used.
            continue;
          } else {
            objectTypeName = objectTypeNameMap[objectTypeId];
            if (objectTypeName === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Missing object type name (ID ' + objectTypeId +
                    ') of heap entry ' + i + ' (size ' + size + ') in a ' +
                    allocatorName + ' heap dump for pid=' + pid + '.'
              });
              continue;
            }
          }

          var size = parseInt(entry.size, 16);
          var count = entry.count === undefined ? undefined :
              parseInt(entry.count, 16);
          heapDump.addEntry(leafStackFrame, objectTypeName, size, count);
        }

        // Throw away heap dumps with no entries. This can happen if all raw
        // entries in the trace are skipped for some reason (e.g. invalid leaf
        // stack frame ID).
        if (heapDump.entries.length > 0)
          heapDumps[allocatorName] = heapDump;
      }

      if (Object.keys(heapDumps).length > 0)
        processMemoryDump.heapDumps = heapDumps;
    },

    parseMemoryDumpLevelOfDetail_: function(levelsOfDetail, dumps, pid,
        dumpId) {
      var rawLevelOfDetail = dumps.level_of_detail;
      var level;
      switch (rawLevelOfDetail) {
        case 'background':
          level = BACKGROUND;
          break;
        case 'light':
          level = LIGHT;
          break;
        case 'detailed':
          level = DETAILED;
          break;
        case undefined:
          level = undefined;
          break;
        default:
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'unknown raw level of detail \'' + rawLevelOfDetail +
                '\' of process memory dump for PID=' + pid +
                ' and dump ID=' + dumpId + '.'
          });
          return;
      }

      if (!this.updateMemoryDumpLevelOfDetail_(
          levelsOfDetail, 'process', level)) {
        this.model_.importWarning({
          type: 'memory_dump_parse_error',
          message: 'diffent levels of detail provided for process memory' +
              ' dump for PID=' + pid + ' (dump ID=' + dumpId + ').'
        });
      }
    },

    updateMemoryDumpLevelOfDetail_: function(levelsOfDetail, scope, level) {
      // If all process memory dump events have the same level of detail (for
      // the particular 'process' or 'global' scope), return true.
      if (!(scope in levelsOfDetail) || level === levelsOfDetail[scope]) {
        levelsOfDetail[scope] = level;
        return true;
      }

      // If the process memory dump events have different levels of detail (for
      // the particular 'process' or 'global' scope), use the highest level and
      // return false.
      if (MEMORY_DUMP_LEVEL_OF_DETAIL_ORDER.indexOf(level) >
          MEMORY_DUMP_LEVEL_OF_DETAIL_ORDER.indexOf(levelsOfDetail[scope])) {
        levelsOfDetail[scope] = level;
      }
      return false;
    },

    parseMemoryDumpAllocatorDumps_: function(processMemoryDump,
        globalMemoryDump, processMemoryAllocatorDumpsByFullName,
        globalMemoryAllocatorDumpsByFullName, allMemoryAllocatorDumpsByGuid,
        dumps, pid, dumpId) {
      var rawAllocatorDumps = dumps.allocators;
      if (rawAllocatorDumps === undefined)
        return;

      // Construct the MemoryAllocatorDump objects without parent links
      // and add them to the processMemoryAllocatorDumpsByName and
      // globalMemoryAllocatorDumpsByName indices appropriately.
      for (var fullName in rawAllocatorDumps) {
        var rawAllocatorDump = rawAllocatorDumps[fullName];

        // Every memory allocator dump should have a GUID. If not, then
        // it cannot be associated with any edges.
        var guid = rawAllocatorDump.guid;
        if (guid === undefined) {
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Memory allocator dump ' + fullName + ' for PID=' + pid +
                ' and dump ID=' + dumpId + ' does not have a GUID.'
          });
        }

        // A memory allocator dump can have optional flags.
        var flags = rawAllocatorDump.flags || 0;
        var isWeakDump = !!(flags & WEAK_MEMORY_ALLOCATOR_DUMP_FLAG);

        // Determine if this is a global memory allocator dump (check if
        // it's prefixed with 'global/').
        var containerMemoryDump;
        var dstIndex;
        if (fullName.startsWith(GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX)) {
          // Global memory allocator dump.
          fullName = fullName.substring(
              GLOBAL_MEMORY_ALLOCATOR_DUMP_PREFIX.length);
          containerMemoryDump = globalMemoryDump;
          dstIndex = globalMemoryAllocatorDumpsByFullName;
        } else {
          // Process memory allocator dump.
          containerMemoryDump = processMemoryDump;
          dstIndex = processMemoryAllocatorDumpsByFullName;
        }

        // Construct or retrieve a memory allocator dump with the provided
        // GUID.
        var allocatorDump = allMemoryAllocatorDumpsByGuid[guid];
        if (allocatorDump === undefined) {
          if (fullName in dstIndex) {
            this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'Multiple GUIDs provided for' +
                  ' memory allocator dump ' + fullName + ': ' +
                  dstIndex[fullName].guid + ', ' + guid + ' (ignored) for' +
                  ' PID=' + pid + ' and dump ID=' + dumpId + '.'
            });
            continue;
          }
          allocatorDump = new tr.model.MemoryAllocatorDump(
              containerMemoryDump, fullName, guid);
          allocatorDump.weak = isWeakDump;
          dstIndex[fullName] = allocatorDump;
          if (guid !== undefined)
            allMemoryAllocatorDumpsByGuid[guid] = allocatorDump;
        } else {
          // A memory allocator dump with this GUID has already been
          // dumped (so we will only add new attributes). Check that it
          // belonged to the same process or was also global.
          if (allocatorDump.containerMemoryDump !== containerMemoryDump) {
            this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Memory allocator dump ' + fullName +
                ' (GUID=' + guid + ') for PID=' + pid + ' and dump ID=' +
                dumpId + ' dumped in different contexts.'
            });
            continue;
          }
          // Check that the names of the memory allocator dumps match.
          if (allocatorDump.fullName !== fullName) {
            this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Memory allocator dump with GUID=' + guid + ' for PID=' +
                pid + ' and dump ID=' + dumpId + ' has multiple names: ' +
                allocatorDump.fullName + ', ' + fullName + ' (ignored).'
            });
            continue;
          }
          if (!isWeakDump) {
            // A MemoryAllocatorDump is non-weak if at least one process dumped
            // it without WEAK_MEMORY_ALLOCATOR_DUMP_FLAG.
            allocatorDump.weak = false;
          }
        }

        // Add all new attributes to the memory allocator dump.
        var attributes = rawAllocatorDump.attrs;
        if (attributes === undefined) {
          this.model_.importWarning({
            type: 'memory_dump_parse_error',
            message: 'Memory allocator dump ' + fullName + ' (GUID=' + guid +
                ') for PID=' + pid + ' and dump ID=' + dumpId +
                ' does not have attributes.'
          });
          attributes = {};
        }

        for (var attrName in attributes) {
          var attrArgs = attributes[attrName];
          var attrType = attrArgs.type;
          var attrValue = attrArgs.value;

          switch (attrType) {
            case 'scalar':
              if (attrName in allocatorDump.numerics) {
                this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Multiple values provided for scalar attribute ' +
                    attrName + ' of memory allocator dump ' + fullName +
                    ' (GUID=' + guid + ') for PID=' + pid + ' and dump ID=' +
                    dumpId + '.'
                });
                break;
              }
              var unit = attrArgs.units === 'bytes' ?
                  tr.b.Unit.byName.sizeInBytes_smallerIsBetter :
                  tr.b.Unit.byName.unitlessNumber_smallerIsBetter;
              var value = parseInt(attrValue, 16);
              allocatorDump.addNumeric(attrName,
                  new tr.v.ScalarNumeric(unit, value));
              break;

            case 'string':
              if (attrName in allocatorDump.diagnostics) {
                this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Multiple values provided for string attribute ' +
                    attrName + ' of memory allocator dump ' + fullName +
                    ' (GUID=' + guid + ') for PID=' + pid + ' and dump ID=' +
                    dumpId + '.'
                });
                break;
              }
              allocatorDump.addDiagnostic(attrName, attrValue);
              break;

            default:
              this.model_.importWarning({
              type: 'memory_dump_parse_error',
              message: 'Unknown type provided for attribute ' + attrName +
                  ' of memory allocator dump ' + fullName + ' (GUID=' + guid +
                  ') for PID=' + pid + ' and dump ID=' + dumpId + ': ' +
                  attrType
              });
              break;
          }
        }
      }
    },

    inferMemoryAllocatorDumpTree_: function(memoryAllocatorDumpsByFullName) {
      var rootAllocatorDumps = [];

      var fullNames = Object.keys(memoryAllocatorDumpsByFullName);
      fullNames.sort();
      for (var i = 0; i < fullNames.length; i++) {
        var fullName = fullNames[i];
        var allocatorDump = memoryAllocatorDumpsByFullName[fullName];

        // This is a loop because we might need to build implicit
        // ancestors in case they were not present in the trace.
        while (true) {
          var lastSlashIndex = fullName.lastIndexOf('/');
          if (lastSlashIndex === -1) {
            // If the dump is a root, add it to the top-level
            // rootAllocatorDumps list.
            rootAllocatorDumps.push(allocatorDump);
            break;
          }

          // If the dump is not a root, find its parent.
          var parentFullName = fullName.substring(0, lastSlashIndex);
          var parentAllocatorDump =
              memoryAllocatorDumpsByFullName[parentFullName];

          // If the parent dump does not exist yet, we build an implicit
          // one and continue up the ancestor chain.
          var parentAlreadyExisted = true;
          if (parentAllocatorDump === undefined) {
            parentAlreadyExisted = false;
            parentAllocatorDump = new tr.model.MemoryAllocatorDump(
                allocatorDump.containerMemoryDump, parentFullName);
            if (allocatorDump.weak !== false) {
              // If we are inferring a parent dump (e.g. 'root/parent') of a
              // current dump (e.g. 'root/parent/current') which is weak (or
              // was also inferred and we don't know yet whether it's weak or
              // not), then we clear the weak flag on the parent dump because
              // we don't know yet whether it should be weak or non-weak:
              //
              //   * We can't mark the parent as non-weak straightaway because
              //     the parent might have no non-weak descendants (in which
              //     case we want the inferred parent to be weak, so that it
              //     would be later removed like the current dump).
              //   * We can't mark the parent as weak immediately either. If we
              //     did and later encounter a non-weak child of the parent
              //     (e.g. 'root/parent/another_child'), then we couldn't
              //     retroactively mark the inferred parent dump as non-weak
              //     because we couldn't tell whether the parent dump was
              //     dumped in the trace as weak (in which case it should stay
              //     weak and be subsequently removed) or whether it was
              //     inferred as weak (in which case it should be changed to
              //     non-weak).
              //
              // Therefore, we defer marking the inferred parent as
              // weak/non-weak. If an inferred parent dump does not have any
              // non-weak child, it will be marked as weak at the end of this
              // method.
              //
              // Note that this should not be confused with the recursive
              // propagation of the weak flag from parent dumps to their
              // children and from owned dumps to their owners, which is
              // performed in GlobalMemoryDump.prototype.removeWeakDumps().
              parentAllocatorDump.weak = undefined;
            }
            memoryAllocatorDumpsByFullName[parentFullName] =
                parentAllocatorDump;
          }

          // Setup the parent <-> children relationships
          allocatorDump.parent = parentAllocatorDump;
          parentAllocatorDump.children.push(allocatorDump);

          // If the parent already existed, then its ancestors were/will be
          // constructed in another iteration of the forEach loop.
          if (parentAlreadyExisted) {
            if (!allocatorDump.weak) {
              // If the current dump is non-weak, then we must ensure that all
              // its inferred ancestors are also non-weak.
              while (parentAllocatorDump !== undefined &&
                     parentAllocatorDump.weak === undefined) {
                parentAllocatorDump.weak = false;
                parentAllocatorDump = parentAllocatorDump.parent;
              }
            }
            break;
          }

          fullName = parentFullName;
          allocatorDump = parentAllocatorDump;
        }
      }

      // All inferred ancestor dumps that have a non-weak child have already
      // been marked as non-weak. We now mark the rest as weak.
      for (var fullName in memoryAllocatorDumpsByFullName) {
        var allocatorDump = memoryAllocatorDumpsByFullName[fullName];
        if (allocatorDump.weak === undefined)
          allocatorDump.weak = true;
      }

      return rootAllocatorDumps;
    },

    parseMemoryDumpAllocatorEdges_: function(allMemoryAllocatorDumpsByGuid,
        dumpIdEvents, dumpId) {
      for (var pid in dumpIdEvents) {
        var processEvents = dumpIdEvents[pid];

        for (var i = 0; i < processEvents.length; i++) {
          var processEvent = processEvents[i];

          var dumps = processEvent.args.dumps;
          if (dumps === undefined)
            continue;

          var rawEdges = dumps.allocators_graph;
          if (rawEdges === undefined)
            continue;

          for (var j = 0; j < rawEdges.length; j++) {
            var rawEdge = rawEdges[j];

            var sourceGuid = rawEdge.source;
            var sourceDump = allMemoryAllocatorDumpsByGuid[sourceGuid];
            if (sourceDump === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Edge for PID=' + pid + ' and dump ID=' + dumpId +
                    ' is missing source memory allocator dump (GUID=' +
                    sourceGuid + ').'
              });
              continue;
            }

            var targetGuid = rawEdge.target;
            var targetDump = allMemoryAllocatorDumpsByGuid[targetGuid];
            if (targetDump === undefined) {
              this.model_.importWarning({
                type: 'memory_dump_parse_error',
                message: 'Edge for PID=' + pid + ' and dump ID=' + dumpId +
                    ' is missing target memory allocator dump (GUID=' +
                    targetGuid + ').'
              });
              continue;
            }

            var importance = rawEdge.importance;
            var edge = new tr.model.MemoryAllocatorDumpLink(
                sourceDump, targetDump, importance);

            switch (rawEdge.type) {
              case 'ownership':
                if (sourceDump.owns !== undefined) {
                  this.model_.importWarning({
                    type: 'memory_dump_parse_error',
                    message: 'Memory allocator dump ' + sourceDump.fullName +
                        ' (GUID=' + sourceGuid + ') already owns a memory' +
                        ' allocator dump (' +
                        sourceDump.owns.target.fullName + ').'
                  });
                } else {
                  sourceDump.owns = edge;
                  targetDump.ownedBy.push(edge);
                }
                break;

              case 'retention':
                sourceDump.retains.push(edge);
                targetDump.retainedBy.push(edge);
                break;

              default:
                this.model_.importWarning({
                  type: 'memory_dump_parse_error',
                  message: 'Invalid edge type: ' + rawEdge.type +
                      ' (PID=' + pid + ', dump ID=' + dumpId +
                      ', source=' + sourceGuid + ', target=' + targetGuid +
                      ', importance=' + importance + ').'
                });
            }
          }
        }
      }
    },

    /**
     * Converts |ts| (in microseconds) to a timestamp in the model clock domain
     * (in milliseconds).
     */
    toModelTimeFromUs_: function(ts) {
      if (!this.toModelTime_) {
        this.toModelTime_ =
            this.model_.clockSyncManager.getModelTimeTransformer(
                this.clockDomainId_);
      }

      return this.toModelTime_(tr.b.Unit.timestampFromUs(ts));
    },

    /**
     * Converts |ts| (in microseconds) to a timestamp in the model clock domain
     * (in milliseconds). If |ts| is undefined, undefined is returned.
     */
    maybeToModelTimeFromUs_: function(ts) {
      if (ts === undefined)
        return undefined;

      return this.toModelTimeFromUs_(ts);
    }
  };

  tr.importer.Importer.register(TraceEventImporter);

  return {
    TraceEventImporter: TraceEventImporter
  };
});
