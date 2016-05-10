/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/statistics.js");
require("../../base/sorted_array_utils.js");
require("../frame.js");
require("../../base/range_utils.js");

'use strict';

/**
 * @fileoverview Class for managing android-specific model meta data,
 * such as rendering apps, and frames rendered.
 */
global.tr.exportTo('tr.model.helpers', function() {
  var Frame = tr.model.Frame;
  var Statistics = tr.b.Statistics;

  var UI_DRAW_TYPE = {
    NONE: 'none',
    LEGACY: 'legacy',
    MARSHMALLOW: 'marshmallow'
  };

  var UI_THREAD_DRAW_NAMES = {
    'performTraversals': UI_DRAW_TYPE.LEGACY,
    'Choreographer#doFrame': UI_DRAW_TYPE.MARSHMALLOW
  };

  var RENDER_THREAD_DRAW_NAME = 'DrawFrame';
  var RENDER_THREAD_INDEP_DRAW_NAME = 'doFrame';
  var THREAD_SYNC_NAME = 'syncFrameState';

  function getSlicesForThreadTimeRanges(threadTimeRanges) {
    var ret = [];
    threadTimeRanges.forEach(function(threadTimeRange) {
      var slices = [];

      threadTimeRange.thread.sliceGroup.iterSlicesInTimeRange(
        function(slice) { slices.push(slice); },
        threadTimeRange.start, threadTimeRange.end);
      ret.push.apply(ret, slices);
    });
    return ret;
  }

  function makeFrame(threadTimeRanges, surfaceFlinger) {
    var args = {};
    if (surfaceFlinger && surfaceFlinger.hasVsyncs) {
      var start = Statistics.min(threadTimeRanges,
          function(threadTimeRanges) { return threadTimeRanges.start; });
      args['deadline'] = surfaceFlinger.getFrameDeadline(start);
      args['frameKickoff'] = surfaceFlinger.getFrameKickoff(start);
    }
    var events = getSlicesForThreadTimeRanges(threadTimeRanges);
    return new Frame(events, threadTimeRanges, args);
  }

  function findOverlappingDrawFrame(renderThread, time) {
    if (!renderThread)
      return undefined;

    var slices = renderThread.sliceGroup.slices;
    for (var i = 0; i < slices.length; i++) {
      var slice = slices[i];
      if (slice.title == RENDER_THREAD_DRAW_NAME &&
          slice.start <= time &&
          time <= slice.end) {
        return slice;
      }
    }
    return undefined;
  }

  /**
   * Builds an array of {start, end} ranges grouping common work of a frame
   * that occurs just before performTraversals().
   *
   * Only necessary before Choreographer#doFrame tracing existed.
   */
  function getPreTraversalWorkRanges(uiThread) {
    if (!uiThread)
      return [];

    // gather all frame work that occurs outside of performTraversals
    var preFrameEvents = [];
    uiThread.sliceGroup.slices.forEach(function(slice) {
      if (slice.title == 'obtainView' ||
          slice.title == 'setupListItem' ||
          slice.title == 'deliverInputEvent' ||
          slice.title == 'RV Scroll')
        preFrameEvents.push(slice);
    });
    uiThread.asyncSliceGroup.slices.forEach(function(slice) {
      if (slice.title == 'deliverInputEvent')
        preFrameEvents.push(slice);
    });

    return tr.b.mergeRanges(
        tr.b.convertEventsToRanges(preFrameEvents),
        3,
        function(events) {
      return {
        start: events[0].min,
        end: events[events.length - 1].max
      };
    });
  }

  function getFrameStartTime(traversalStart, preTraversalWorkRanges) {
    var preTraversalWorkRange = tr.b.findClosestIntervalInSortedIntervals(
        preTraversalWorkRanges,
        function(range) { return range.start },
        function(range) { return range.end },
        traversalStart,
        3);

    if (preTraversalWorkRange)
      return preTraversalWorkRange.start;
    return traversalStart;
  }

  function getUiThreadDrivenFrames(app) {
    if (!app.uiThread)
      return [];

    var preTraversalWorkRanges = [];
    if (app.uiDrawType == UI_DRAW_TYPE.LEGACY)
      preTraversalWorkRanges = getPreTraversalWorkRanges(app.uiThread);

    var frames = [];
    app.uiThread.sliceGroup.slices.forEach(function(slice) {
      if (!(slice.title in UI_THREAD_DRAW_NAMES)) {
        return;
      }

      var threadTimeRanges = [];
      var uiThreadTimeRange = {
        thread: app.uiThread,
        start: getFrameStartTime(slice.start, preTraversalWorkRanges),
        end: slice.end
      };
      threadTimeRanges.push(uiThreadTimeRange);

      // on SDK 21+ devices with RenderThread,
      // account for time taken on RenderThread
      var rtDrawSlice = findOverlappingDrawFrame(
          app.renderThread, slice.end);
      if (rtDrawSlice) {
        var rtSyncSlice = rtDrawSlice.findDescendentSlice(THREAD_SYNC_NAME);
        if (rtSyncSlice) {
          // Generally, the UI thread is only on the critical path
          // until the start of sync.
          uiThreadTimeRange.end = Math.min(uiThreadTimeRange.end,
                                           rtSyncSlice.start);
        }

        threadTimeRanges.push({
          thread: app.renderThread,
          start: rtDrawSlice.start,
          end: rtDrawSlice.end
        });
      }
      frames.push(makeFrame(threadTimeRanges, app.surfaceFlinger));
    });
    return frames;
  }

  function getRenderThreadDrivenFrames(app) {
    if (!app.renderThread)
      return [];

    var frames = [];
    app.renderThread.sliceGroup.getSlicesOfName(RENDER_THREAD_INDEP_DRAW_NAME)
        .forEach(function(slice) {
      var threadTimeRanges = [{
        thread: app.renderThread,
        start: slice.start,
        end: slice.end
      }];
      frames.push(makeFrame(threadTimeRanges, app.surfaceFlinger));
    });
    return frames;
  }

  function getUiDrawType(uiThread) {
    if (!uiThread)
      return UI_DRAW_TYPE.NONE;

    var slices = uiThread.sliceGroup.slices;
    for (var i = 0; i < slices.length; i++) {
      if (slices[i].title in UI_THREAD_DRAW_NAMES) {
        return UI_THREAD_DRAW_NAMES[slices[i].title];
      }
    }
    return UI_DRAW_TYPE.NONE;
  }

  function getInputSamples(process) {
    var samples = undefined;
    for (var counterName in process.counters) {
          if (/^android\.aq\:pending/.test(counterName) &&
        process.counters[counterName].numSeries == 1) {
        samples = process.counters[counterName].series[0].samples;
        break;
      }
    }

    if (!samples)
      return [];

    // output rising edges only, since those are user inputs
    var inputSamples = [];
    var lastValue = 0;
    samples.forEach(function(sample) {
      if (sample.value > lastValue) {
        inputSamples.push(sample);
      }
      lastValue = sample.value;
    });
    return inputSamples;
  }

  function getAnimationAsyncSlices(uiThread) {
    if (!uiThread)
      return [];

    var slices = [];
    uiThread.asyncSliceGroup.iterateAllEvents(function(slice) {
      if (/^animator\:/.test(slice.title))
        slices.push(slice);
    });
    return slices;
  }

  /**
   * Model for Android App specific data.
   * @constructor
   */
  function AndroidApp(process, uiThread, renderThread, surfaceFlinger,
      uiDrawType) {
    this.process = process;
    this.uiThread = uiThread;
    this.renderThread = renderThread;
    this.surfaceFlinger = surfaceFlinger;
    this.uiDrawType = uiDrawType;

    this.frames_ = undefined;
    this.inputs_ = undefined;
  };

  AndroidApp.createForProcessIfPossible = function(process, surfaceFlinger) {
    var uiThread = process.getThread(process.pid);
    var uiDrawType = getUiDrawType(uiThread);
    if (uiDrawType == UI_DRAW_TYPE.NONE) {
      uiThread = undefined;
    }
    var renderThreads = process.findAllThreadsNamed('RenderThread');
    var renderThread = renderThreads.length == 1 ? renderThreads[0] : undefined;

    if (uiThread || renderThread) {
      return new AndroidApp(process, uiThread, renderThread, surfaceFlinger,
        uiDrawType);
    }
  };

  AndroidApp.prototype = {
  /**
   * Returns a list of all frames in the trace for the app,
   * constructed on first query.
   */
    getFrames: function() {
      if (!this.frames_) {
        var uiFrames = getUiThreadDrivenFrames(this);
        var rtFrames = getRenderThreadDrivenFrames(this);
        this.frames_ = uiFrames.concat(rtFrames);

        // merge frames by sorting by end timestamp
        this.frames_.sort(function(a, b) { a.end - b.end });
      }
      return this.frames_;
    },

    /**
     * Returns list of CounterSamples for each input event enqueued to the app.
     */
    getInputSamples: function() {
      if (!this.inputs_) {
        this.inputs_ = getInputSamples(this.process);
      }
      return this.inputs_;
    },

    getAnimationAsyncSlices: function() {
      if (!this.animations_) {
        this.animations_ = getAnimationAsyncSlices(this.uiThread);
      }
      return this.animations_;
    }
  };

  return {
    AndroidApp: AndroidApp
  };
});
