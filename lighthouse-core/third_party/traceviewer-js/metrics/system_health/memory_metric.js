/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/iteration_helpers.js");
require("../../base/multi_dimensional_view.js");
require("../../base/range.js");
require("../metric_registry.js");
require("../../model/container_memory_dump.js");
require("../../model/helpers/chrome_model_helper.js");
require("../../model/memory_allocator_dump.js");
require("../../value/numeric.js");
require("../../value/unit.js");
require("../../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  var LIGHT = tr.model.ContainerMemoryDump.LevelOfDetail.LIGHT;
  var DETAILED = tr.model.ContainerMemoryDump.LevelOfDetail.DETAILED;
  var ScalarNumeric = tr.v.ScalarNumeric;
  var sizeInBytes_smallerIsBetter =
      tr.v.Unit.byName.sizeInBytes_smallerIsBetter;
  var unitlessNumber_smallerIsBetter =
      tr.v.Unit.byName.unitlessNumber_smallerIsBetter;
  var DISPLAYED_SIZE_NUMERIC_NAME =
      tr.model.MemoryAllocatorDump.DISPLAYED_SIZE_NUMERIC_NAME;

  var LEVEL_OF_DETAIL_NAMES = new Map();
  LEVEL_OF_DETAIL_NAMES.set(LIGHT, 'light');
  LEVEL_OF_DETAIL_NAMES.set(DETAILED, 'detailed');

  var MEMORY_NUMERIC_BUILDER_MAP = new WeakMap();
  // For unitless numerics (process counts), we use 20 linearly scaled bins
  // from 0 to 20.
  MEMORY_NUMERIC_BUILDER_MAP.set(unitlessNumber_smallerIsBetter,
      tr.v.NumericBuilder.createLinear(
          tr.v.Unit.byName.unitlessNumber_smallerIsBetter,
          tr.b.Range.fromExplicitRange(0, 20), 20));
  // For size numerics (subsystem and vm stats), we use 1 bin from 0 B to
  // 1 KiB and 4*24 exponentially scaled bins from 1 KiB to 16 GiB (=2^24 KiB).
  MEMORY_NUMERIC_BUILDER_MAP.set(sizeInBytes_smallerIsBetter,
      new tr.v.NumericBuilder(sizeInBytes_smallerIsBetter, 0)
          .addBinBoundary(1024 /* 1 KiB */)
          .addExponentialBins(16 * 1024 * 1024 * 1024 /* 16 GiB */, 4 * 24));

  function memoryMetric(values, model, opt_options) {
    var rangeOfInterest = opt_options ? opt_options.rangeOfInterest : undefined;
    var browserNameToGlobalDumps =
        splitGlobalDumpsByBrowserName(model, rangeOfInterest);
    addGeneralMemoryDumpValues(browserNameToGlobalDumps, values);
    addDetailedMemoryDumpValues(browserNameToGlobalDumps, values);
    addMemoryDumpCountValues(browserNameToGlobalDumps, values);
  }

  /**
   * Splits the global memory dumps in |model| by browser name.
   *
   * @param {!tr.Model} model The trace model from which the global dumps
   *     should be extracted.
   * @param {!tr.b.Range=} opt_rangeOfInterest If proided, global memory dumps
   *     that do not inclusively intersect the range will be skipped.
   * @return {!Map<string, !Array<!tr.model.GlobalMemoryDump>} A map from
   *     browser names to the associated global memory dumps.
   */
  function splitGlobalDumpsByBrowserName(model, opt_rangeOfInterest) {
    var chromeModelHelper =
        model.getOrCreateHelper(tr.model.helpers.ChromeModelHelper);
    var browserNameToGlobalDumps = new Map();
    var globalDumpToBrowserHelper = new WeakMap();

    // 1. For each browser process in the model, add its global memory dumps to
    // |browserNameToGlobalDumps|. |chromeModelHelper| can be undefined if
    // it fails to find any browser, renderer or GPU process (see
    // tr.model.helpers.ChromeModelHelper.supportsModel).
    if (chromeModelHelper) {
      chromeModelHelper.browserHelpers.forEach(function(helper) {
        // Retrieve the associated global memory dumps and check that they
        // haven't been classified as belonging to another browser process.
        var globalDumps = skipDumpsThatDoNotIntersectRange(
            helper.process.memoryDumps.map(d => d.globalMemoryDump),
            opt_rangeOfInterest);
        globalDumps.forEach(function(globalDump) {
          var existingHelper = globalDumpToBrowserHelper.get(globalDump);
          if (existingHelper !== undefined) {
            throw new Error('Memory dump ID clash across multiple browsers ' +
                'with PIDs: ' + existingHelper.pid + ' and ' + helper.pid);
          }
          globalDumpToBrowserHelper.set(globalDump, helper);
        });

        makeKeyUniqueAndSet(browserNameToGlobalDumps,
            canonicalizeName(helper.browserName), globalDumps);
      });
    }

    // 2. If any global memory dump does not have any associated browser
    // process for some reason, associate it with an 'unknown_browser' browser
    // so that we don't lose the data.
    var unclassifiedGlobalDumps = skipDumpsThatDoNotIntersectRange(
        model.globalMemoryDumps.filter(g => !globalDumpToBrowserHelper.has(g)),
        opt_rangeOfInterest);
    if (unclassifiedGlobalDumps.length > 0) {
      makeKeyUniqueAndSet(
          browserNameToGlobalDumps, 'unknown_browser', unclassifiedGlobalDumps);
    }

    return browserNameToGlobalDumps;
  }

  function skipDumpsThatDoNotIntersectRange(dumps, opt_range) {
    if (!opt_range)
      return dumps;
    return dumps.filter(d => opt_range.intersectsExplicitRangeInclusive(
        d.start, d.end));
  }

  function canonicalizeName(name) {
    return name.toLowerCase().replace(' ', '_');
  };

  var USER_FRIENDLY_BROWSER_NAMES = {
    'chrome': 'Chrome',
    'webview': 'WebView',
    'unknown_browser': 'an unknown browser'
  };

  /**
   * Convert a canonical browser name used in value names to a user-friendly
   * name used in value descriptions.
   *
   * Examples:
   *
   *   CANONICAL BROWSER NAME -> USER-FRIENDLY NAME
   *   chrome                 -> Chrome
   *   unknown_browser        -> an unknown browser
   *   webview2               -> WebView(2)
   *   unexpected             -> 'unexpected' browser
   */
  function convertBrowserNameToUserFriendlyName(browserName) {
    for (var baseName in USER_FRIENDLY_BROWSER_NAMES) {
      if (!browserName.startsWith(baseName))
        continue;
      var userFriendlyBaseName = USER_FRIENDLY_BROWSER_NAMES[baseName];
      var suffix = browserName.substring(baseName.length);
      if (suffix.length === 0)
        return userFriendlyBaseName;
      else if (/^\d+$/.test(suffix))
        return userFriendlyBaseName + '(' + suffix + ')';
    }
    return '\'' + browserName + '\' browser';
  }

  function canonicalizeProcessName(rawProcessName) {
    if (!rawProcessName)
      return 'unknown_processes';
    var baseCanonicalName = canonicalizeName(rawProcessName);
    switch (baseCanonicalName) {
      case 'renderer':
        return 'renderer_processes';  // Intentionally plural.
      case 'browser':
        return 'browser_process';
      default:
        return baseCanonicalName;
    }
  }

  /**
   * Convert a canonical process name used in value names to a user-friendly
   * name used in value descriptions.
   */
  function convertProcessNameToUserFriendlyName(processName,
      opt_requirePlural) {
    switch (processName) {
      case 'browser_process':
        return opt_requirePlural ? 'browser processes' : 'the browser process';
      case 'renderer_processes':
        return 'renderer processes';
      case 'gpu_process':
        return opt_requirePlural ? 'GPU processes' : 'the GPU process';
      case 'ppapi_process':
        return opt_requirePlural ? 'PPAPI processes' : 'the PPAPI process';
      case 'all_processes':
        return 'all processes';
      case 'unknown_processes':
        return 'unknown processes';
      default:
        return '\'' + processName + '\' processes';
    }
  }

  /**
   * Function for adding entries with duplicate keys to a map without
   * overriding existing entries.
   *
   * This is achieved by appending numeric indices (2, 3, 4, ...) to duplicate
   * keys. Example:
   *
   *   var map = new Map();
   *   // map = Map {}.
   *
   *   makeKeyUniqueAndSet(map, 'key', 'a');
   *   // map = Map {"key" => "a"}.
   *
   *   makeKeyUniqueAndSet(map, 'key', 'b');
   *   // map = Map {"key" => "a", "key2" => "b"}.
   *                                ^^^^
   *   makeKeyUniqueAndSet(map, 'key', 'c');
   *   // map = Map {"key" => "a", "key2" => "b", "key3" => "c"}.
   *                                ^^^^           ^^^^
   */
  function makeKeyUniqueAndSet(map, key, value) {
    var uniqueKey = key;
    var nextIndex = 2;
    while (map.has(uniqueKey)) {
      uniqueKey = key + nextIndex;
      nextIndex++;
    }
    map.set(uniqueKey, value);
  }

  /**
   * Add general memory dump values calculated from all global memory dumps to
   * |values|. In particular, this function adds the following values:
   *
   *   * PROCESS COUNTS
   *     memory:{chrome, webview}:
   *         {browser_process, renderer_processes, ..., all_processes}:
   *         process_count
   *     type: tr.v.Numeric (histogram over all matching global memory dumps)
   *     unit: unitlessNumber_smallerIsBetter
   *
   *   * MEMORY USAGE REPORTED BY CHROME
   *     memory:{chrome, webview}:
   *         {browser_process, renderer_processes, ..., all_processes}:
   *         reported_by_chrome[:{v8, malloc, ...}]:
   *         {effective_size, allocated_objects_size, locked_size}
   *     type: tr.v.Numeric (histogram over all matching global memory dumps)
   *     unit: sizeInBytes_smallerIsBetter
   */
  function addGeneralMemoryDumpValues(browserNameToGlobalDumps, values) {
    addMemoryDumpValues(browserNameToGlobalDumps,
        gmd => true /* process all global memory dumps */,
        function(processDump, addProcessScalar) {
          // Increment memory:<browser-name>:<process-name>:process_count value.
          addProcessScalar({
            source: 'process_count',
            value: 1,
            unit: unitlessNumber_smallerIsBetter,
            descriptionPrefixBuilder: buildProcessCountDescriptionPrefix
          });

          // Add memory:<browser-name>:<process-name>:reported_by_chrome:...
          // values.
          if (processDump.memoryAllocatorDumps === undefined)
            return;
          processDump.memoryAllocatorDumps.forEach(function(rootAllocatorDump) {
            tr.b.iterItems(CHROME_VALUE_PROPERTIES,
                function(propertyName, descriptionPrefixBuilder) {
                  addProcessScalar({
                    source: 'reported_by_chrome',
                    component: [rootAllocatorDump.name],
                    property: propertyName,
                    value: rootAllocatorDump.numerics[propertyName],
                    descriptionPrefixBuilder: descriptionPrefixBuilder
                  });
                });
          });
          // Add memory:<browser-name>:<process-name>:reported_by_chrome:v8:
          // allocated_by_malloc:effective_size when available.
          var v8Dump = processDump.getMemoryAllocatorDumpByFullName('v8');
          if (v8Dump !== undefined) {
            var allocatedByMalloc = 0;
            var peakAllocatedByMalloc = 0;
            var hasMallocDump = false;
            v8Dump.children.forEach(function(isolateDump) {
              var mallocDump =
                  isolateDump.getDescendantDumpByFullName('malloc');
              if (mallocDump === undefined)
                return;
              if (mallocDump.numerics['effective_size'] !== undefined) {
                allocatedByMalloc +=
                    mallocDump.numerics['effective_size'].value;
              }
              if (mallocDump.numerics['peak_size'] !== undefined)
                peakAllocatedByMalloc += mallocDump.numerics['peak_size'].value;
              hasMallocDump = true;
            });
            if (hasMallocDump) {
              addProcessScalar({
                source: 'reported_by_chrome',
                component: ['v8', 'allocated_by_malloc'],
                property: 'effective_size',
                value: allocatedByMalloc,
                unit: sizeInBytes_smallerIsBetter,
                descriptionPrefixBuilder:
                    CHROME_VALUE_PROPERTIES['effective_size']
              });
              addProcessScalar({
                source: 'reported_by_chrome',
                component: ['v8', 'allocated_by_malloc'],
                property: 'peak_size',
                value: peakAllocatedByMalloc,
                unit: sizeInBytes_smallerIsBetter,
                descriptionPrefixBuilder:
                    CHROME_VALUE_PROPERTIES['peak_size']
              });
            }
          }
        },
        function(componentTree) {
          // Subtract memory:<browser-name>:<process-name>:reported_by_chrome:
          // tracing:<size-property> from memory:<browser-name>:<process-name>:
          // reported_by_chrome:<size-property> if applicable.
          var tracingNode = componentTree.children[1].get('tracing');
          if (tracingNode === undefined)
            return;
          for (var i = 0; i < componentTree.values.length; i++)
            componentTree.values[i].total -= tracingNode.values[i].total;
        }, values);
  }

  /**
   * Build a description prefix for a memory:<browser-name>:<process-name>:
   * process_count value.
   *
   * @param {!Array<string>} componentPath The underlying component path (must
   *     be empty).
   * @param {string} processName The canonical name of the process.
   * @return {string} Prefix for the value's description (always
   *     'total number of renderer processes').
   */
  function buildProcessCountDescriptionPrefix(componentPath, processName) {
    if (componentPath.length > 0) {
      throw new Error('Unexpected process count non-empty component path: ' +
          componentPath.join(':'));
    }
    return 'total number of ' + convertProcessNameToUserFriendlyName(
        processName, true /* opt_requirePlural */);
  }

  /**
   * Build a description prefix for a memory:<browser-name>:<process-name>:
   * reported_by_chrome:... value.
   *
   * @param {{
   *     userFriendlyPropertyName: string,
   *     userFriendlyPropertyNamePrefix: (string|undefined),
   *     totalUserFriendlyPropertyName: (string|undefined),
   *     componentPreposition: (string|undefined) }}
   *     formatSpec Specification of how the property should be formatted.
   * @param {!Array<string>} componentPath The underlying component path (e.g.
   *     ['malloc']).
   * @param {string} processName The canonical name of the process.
   * @return {string} Prefix for the value's description (e.g.
   *     'effective size of malloc in the browser process').
   */
  function buildChromeValueDescriptionPrefix(
      formatSpec, componentPath, processName) {
    var nameParts = [];
    if (componentPath.length === 0) {
      nameParts.push('total');
      if (formatSpec.totalUserFriendlyPropertyName) {
        nameParts.push(formatSpec.totalUserFriendlyPropertyName);
      } else {
        if (formatSpec.userFriendlyPropertyNamePrefix)
          nameParts.push(formatSpec.userFriendlyPropertyNamePrefix);
        nameParts.push(formatSpec.userFriendlyPropertyName);
      }
      nameParts.push('reported by Chrome for');
    } else {
      if (formatSpec.componentPreposition === undefined) {
        // Use component name as an adjective
        // (e.g. 'size of V8 code and metadata').
        if (formatSpec.userFriendlyPropertyNamePrefix)
          nameParts.push(formatSpec.userFriendlyPropertyNamePrefix);
        nameParts.push(componentPath.join(':'));
        nameParts.push(formatSpec.userFriendlyPropertyName);
      } else {
        // Use component name as a noun with a preposition
        // (e.g. 'size of all objects allocated BY MALLOC').
        if (formatSpec.userFriendlyPropertyNamePrefix)
          nameParts.push(formatSpec.userFriendlyPropertyNamePrefix);
        nameParts.push(formatSpec.userFriendlyPropertyName);
        nameParts.push(formatSpec.componentPreposition);
        if (componentPath[componentPath.length - 1] === 'allocated_by_malloc') {
          nameParts.push('objects allocated by malloc for');
          nameParts.push(
              componentPath.slice(0, componentPath.length - 1).join(':'));
        } else {
          nameParts.push(componentPath.join(':'));
        }
      }
      nameParts.push('in');
    }
    nameParts.push(convertProcessNameToUserFriendlyName(processName));
    return nameParts.join(' ');
  }

  // Specifications of properties reported by Chrome.
  var CHROME_VALUE_PROPERTIES = {
    'effective_size': buildChromeValueDescriptionPrefix.bind(undefined, {
      userFriendlyPropertyName: 'effective size',
      componentPreposition: 'of'
    }),
    'allocated_objects_size': buildChromeValueDescriptionPrefix.bind(
        undefined, {
          userFriendlyPropertyName: 'size of all objects allocated',
          totalUserFriendlyPropertyName: 'size of all allocated objects',
          componentPreposition: 'by'
        }),
    'locked_size': buildChromeValueDescriptionPrefix.bind(undefined, {
      userFriendlyPropertyName: 'locked (pinned) size',
      componentPreposition: 'of'
    }),
    'peak_size': buildChromeValueDescriptionPrefix.bind(undefined, {
      userFriendlyPropertyName: 'peak size',
      componentPreposition: 'of'
    }),
  };

  /**
   * Add heavy memory dump values calculated from heavy global memory dumps to
   * |values|. In particular, this function adds the following values:
   *
   *   * MEMORY USAGE REPORTED BY THE OS
   *     memory:{chrome, webview}:
   *         {browser_process, renderer_processes, ..., all_processes}:
   *         reported_by_os:system_memory:[{ashmem, native_heap, java_heap}:]
   *         {proportional_resident_size, private_dirty_size}
   *     memory:{chrome, webview}:
   *         {browser_process, renderer_processes, ..., all_processes}:
   *         reported_by_os:gpu_memory:[{gl, graphics, ...}:]
   *         proportional_resident_size
   *     type: tr.v.Numeric (histogram over matching heavy global memory dumps)
   *     unit: sizeInBytes_smallerIsBetter
   *
   *   * MEMORY USAGE REPORTED BY CHROME
   *     memory:{chrome, webview}:
   *         {browser_process, renderer_processes, ..., all_processes}:
   *         reported_by_chrome:v8:code_and_metadata_size
   *     type: tr.v.Numeric (histogram over matching heavy global memory dumps)
   *     unit: sizeInBytes_smallerIsBetter
   */
  function addDetailedMemoryDumpValues(browserNameToGlobalDumps, values) {
    addMemoryDumpValues(browserNameToGlobalDumps,
        g => g.levelOfDetail === DETAILED,
        function(processDump, addProcessScalar) {
          // Add memory:<browser-name>:<process-name>:reported_by_os:
          // system_memory:... values.
          tr.b.iterItems(
              SYSTEM_VALUE_COMPONENTS,
              function(componentName, componentSpec) {
                tr.b.iterItems(
                    SYSTEM_VALUE_PROPERTIES,
                    function(propertyName, propertySpec) {
                      var node = getDescendantVmRegionClassificationNode(
                          processDump.vmRegions,
                          componentSpec.classificationPath);
                      var componentPath = ['system_memory'];
                      if (componentName)
                        componentPath.push(componentName);
                      addProcessScalar({
                        source: 'reported_by_os',
                        component: componentPath,
                        property: propertyName,
                        value: node === undefined ?
                            0 : (node.byteStats[propertySpec.byteStat] || 0),
                        unit: sizeInBytes_smallerIsBetter,
                        descriptionPrefixBuilder:
                            propertySpec.descriptionPrefixBuilder
                      });
                    });
              });

          // Add memory:<browser-name>:<process-name>:reported_by_os:
          // gpu_memory:... values.
          var memtrackDump = processDump.getMemoryAllocatorDumpByFullName(
              'gpu/android_memtrack');
          if (memtrackDump !== undefined) {
            var descriptionPrefixBuilder = SYSTEM_VALUE_PROPERTIES[
                'proportional_resident_size'].descriptionPrefixBuilder;
            memtrackDump.children.forEach(function(memtrackChildDump) {
              var childName = memtrackChildDump.name;
              addProcessScalar({
                source: 'reported_by_os',
                component: ['gpu_memory', childName],
                property: 'proportional_resident_size',
                value: memtrackChildDump.numerics['memtrack_pss'],
                descriptionPrefixBuilder: descriptionPrefixBuilder
              });
            });
          }

          // Add memory:<browser-name>:<process-name>:reported_by_chrome:v8:
          // code_and_metadata_size when available.
          var v8Dump = processDump.getMemoryAllocatorDumpByFullName('v8');
          if (v8Dump !== undefined) {
            // V8 generates bytecode when interpreting and code objects when
            // compiling the javascript. Total code size includes the size
            // of code and bytecode objects.
            addProcessScalar({
              source: 'reported_by_chrome',
              component: ['v8'],
              property: 'code_and_metadata_size',
              value: v8Dump.numerics['code_and_metadata_size'],
              descriptionPrefixBuilder:
                  buildCodeAndMetadataSizeValueDescriptionPrefix
            });
            addProcessScalar({
              source: 'reported_by_chrome',
              component: ['v8'],
              property: 'code_and_metadata_size',
              value: v8Dump.numerics['bytecode_and_metadata_size'],
              descriptionPrefixBuilder:
                  buildCodeAndMetadataSizeValueDescriptionPrefix
            });
          }
        }, function(componentTree) {}, values);
  }

  // Specifications of components reported by the system.
  var SYSTEM_VALUE_COMPONENTS = {
    '': {
      classificationPath: [],
    },
    'java_heap': {
      classificationPath: ['Android', 'Java runtime', 'Spaces'],
      userFriendlyName: 'the Java heap'
    },
    'ashmem': {
      classificationPath: ['Android', 'Ashmem'],
      userFriendlyName: 'ashmem'
    },
    'native_heap': {
      classificationPath: ['Native heap'],
      userFriendlyName: 'the native heap'
    }
  };

  // Specifications of properties reported by the system.
  var SYSTEM_VALUE_PROPERTIES = {
    'proportional_resident_size': {
      byteStat: 'proportionalResident',
      descriptionPrefixBuilder: buildOsValueDescriptionPrefix.bind(
          undefined, 'proportional resident size (PSS)')
    },
    'private_dirty_size': {
      byteStat: 'privateDirtyResident',
      descriptionPrefixBuilder: buildOsValueDescriptionPrefix.bind(
          undefined, 'private dirty size')
    }
  };

  /**
   * Build a description prefix for a memory:<browser-name>:<process-name>:
   * reported_by_os:... value.
   *
   * @param {string} userFriendlyPropertyName User-friendly name of the
   *     underlying property (e.g. 'private dirty size').
   * @param {!Array<string>} componentPath The underlying component path (e.g.
   *     ['system', 'java_heap']).
   * @param {string} processName The canonical name of the process.
   * @return {string} Prefix for the value's description (e.g.
   *     'total private dirty size of the Java heal in the GPU process').
   */
  function buildOsValueDescriptionPrefix(
      userFriendlyPropertyName, componentPath, processName) {
    if (componentPath.length > 2) {
      throw new Error('OS value component path for \'' +
          userFriendlyPropertyName + '\' too long: ' + componentPath.join(':'));
    }

    var nameParts = [];
    if (componentPath.length < 2)
      nameParts.push('total');

    nameParts.push(userFriendlyPropertyName);

    if (componentPath.length > 0) {
      switch (componentPath[0]) {
        case 'system_memory':
          if (componentPath.length > 1) {
            var userFriendlyComponentName =
                SYSTEM_VALUE_COMPONENTS[componentPath[1]].userFriendlyName;
            if (userFriendlyComponentName === undefined) {
              throw new Error('System value sub-component for \'' +
                  userFriendlyPropertyName + '\' unknown: ' +
                  componentPath.join(':'));
            }
            nameParts.push('of', userFriendlyComponentName, 'in');
          } else {
            nameParts.push('of system memory (RAM) used by');
          }
          break;

        case 'gpu_memory':
          if (componentPath.length > 1) {
            nameParts.push('of the', componentPath[1]);
            nameParts.push('Android memtrack component in');
          } else {
            nameParts.push('of GPU memory (Android memtrack) used by');
          }
          break;

        default:
          throw new Error('OS value component for \'' +
              userFriendlyPropertyName + '\' unknown: ' +
              componentPath.join(':'));
      }
    } else {
      nameParts.push('reported by the OS for');
    }

    nameParts.push(convertProcessNameToUserFriendlyName(processName));
    return nameParts.join(' ');
  }

  /**
   * Build a description prefix for a memory:<browser-name>:<process-name>:
   * reported_by_chrome:...:code_and_metadata_size value.
   *
   * @param {!Array<string>} componentPath The underlying component path (e.g.
   *     ['v8']).
   * @param {string} processName The canonical name of the process.
   * @return {string} Prefix for the value's description (e.g.
   *     'size of v8 code and metadata in').
   */
  function buildCodeAndMetadataSizeValueDescriptionPrefix(
      componentPath, processName) {
    return buildChromeValueDescriptionPrefix({
      userFriendlyPropertyNamePrefix: 'size of',
      userFriendlyPropertyName: 'code and metadata'
    }, componentPath, processName);
  }

  /**
   * Get the descendant of a VM region classification |node| specified by the
   * given |path| of child node titles. If |node| is undefined or such a
   * descendant does not exist, this function returns undefined.
   */
  function getDescendantVmRegionClassificationNode(node, path) {
    for (var i = 0; i < path.length; i++) {
      if (node === undefined)
        break;
      node = tr.b.findFirstInArray(node.children, c => c.title === path[i]);
    }
    return node;
  }

  /**
   * Add global memory dump counts to |values|. In particular, this function
   * adds the following values:
   *
   *   * DUMP COUNTS
   *     memory:{chrome, webview}:all_processes:dump_count[:{light, detailed}]
   *     type: tr.v.ScalarNumeric (scalar over the whole trace)
   *     unit: unitlessNumber_smallerIsBetter
   *
   * Note that unlike all other values generated by the memory metric, the
   * global memory dump counts are NOT instances of tr.v.Numeric (histogram)
   * because it doesn't make sense to aggregate them (they are already counts
   * over all global dumps associated with the relevant browser).
   */
  function addMemoryDumpCountValues(browserNameToGlobalDumps, values) {
    browserNameToGlobalDumps.forEach(function(globalDumps, browserName) {
      var totalDumpCount = 0;
      var levelOfDetailNameToDumpCount = {};
      LEVEL_OF_DETAIL_NAMES.forEach(function(levelOfDetailName) {
        levelOfDetailNameToDumpCount[levelOfDetailName] = 0;
      });

      globalDumps.forEach(function(globalDump) {
        totalDumpCount++;

        // Increment the level-of-detail-specific dump count (if possible).
        var levelOfDetailName =
            LEVEL_OF_DETAIL_NAMES.get(globalDump.levelOfDetail);
        if (!(levelOfDetailName in levelOfDetailNameToDumpCount))
          return;  // Unknown level of detail.
        levelOfDetailNameToDumpCount[levelOfDetailName]++;
      });

      // Add memory:<browser-name>:all_processes:dump_count[:<level>] values.
      reportMemoryDumpCountAsValue(browserName, undefined /* total */,
          totalDumpCount, values);
      tr.b.iterItems(levelOfDetailNameToDumpCount,
          function(levelOfDetailName, levelOfDetailDumpCount) {
            reportMemoryDumpCountAsValue(browserName, levelOfDetailName,
                levelOfDetailDumpCount, values);
          });
    });
  }

  /**
   * Add a tr.v.ScalarNumeric value to |values| reporting that the number of
   * |levelOfDetailName| memory dumps added by |browserName| was
   * |levelOfDetailCount|.
   */
  function reportMemoryDumpCountAsValue(
      browserName, levelOfDetailName, levelOfDetailDumpCount, values) {
    // Construct the name of the memory value.
    var nameParts = ['memory', browserName, 'all_processes', 'dump_count'];
    if (levelOfDetailName !== undefined)
      nameParts.push(levelOfDetailName);
    var name = nameParts.join(':');

    // Build the underlying numeric for the memory value.
    var numeric = new ScalarNumeric(
        unitlessNumber_smallerIsBetter, levelOfDetailDumpCount);

    // Build the options for the memory value.
    var description = [
      'total number of',
      levelOfDetailName || 'all',
      'memory dumps added by',
      convertBrowserNameToUserFriendlyName(browserName),
      'to the trace'
    ].join(' ');
    var options = { description: description };

    // Report the memory value.
    values.addValue(new tr.v.NumericValue(name, numeric, options));
  }

  /**
   * Add generic values extracted from process memory dumps and aggregated by
   * process name and component path into |values|.
   *
   * For each browser and set of global dumps in |browserNameToGlobalDumps|,
   * |customProcessDumpValueExtractor| is applied to every process memory dump
   * associated with the global memory dump. The second argument provided to the
   * callback is a function for adding extracted values:
   *
   *   function sampleProcessDumpCallback(processDump, addProcessValue) {
   *     ...
   *     addProcessScalar({
   *       source: 'reported_by_chrome',
   *       component: ['system', 'native_heap'],
   *       property: 'proportional_resident_size',
   *       value: pssExtractedFromProcessDump2,
   *       descriptionPrefixBuilder: function(componentPath) {
   *         return 'PSS of ' + componentPath.join('/') + ' in';
   *       }
   *     });
   *     ...
   *   }
   *
   * For each global memory dump, the extracted values are summed by process
   * name (browser_process, renderer_processes, ..., all_processes) and
   * component path (e.g. gpu is a sum of gpu:gl, gpu:graphics, ...). The sums
   * are then aggregated over all global memory dumps associated with the given
   * browser. For example, assuming that |customProcessDumpValueExtractor|
   * extracts 'proportional_resident_size' values for component paths
   * ['X', 'A'], ['X', 'B'] and ['Y'] under the same 'source' from each process
   * memory dump, the following values will be reported (for Chrome):
   *
   *    memory:chrome:browser_process:source:X:A:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A in all 'browser' process dumps in global dump 1,
   *          ...
   *          sum of X:A in all 'browser' process dumps in global dump N
   *        ]
   *
   *    memory:chrome:browser_process:source:X:B:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:B in all 'browser' process dumps in global dump 1,
   *          ...
   *          sum of X:B in all 'browser' process dumps in global dump N
   *        ]
   *
   *    memory:chrome:browser_process:source:X:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A+X:B in all 'browser' process dumps in global dump 1,
   *          ...
   *          sum of X:A+X:B in all 'browser' process dumps in global dump N
   *        ]
   *
   *    memory:chrome:browser_process:source:Y:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of Y in all 'browser' process dumps in global dump 1,
   *          ...
   *          sum of Y in all 'browser' process dumps in global dump N
   *        ]
   *
   *    memory:chrome:browser_process:source:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A+X:B+Y in all 'browser' process dumps in global dump 1,
   *          ...
   *          sum of X:A+X:B+Y in all 'browser' process dumps in global dump N
   *        ]
   *
   *    ...
   *
   *    memory:chrome:all_processes:source:X:A:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A in all process dumps in global dump 1,
   *          ...
   *          sum of X:A in all process dumps in global dump N,
   *    ]
   *
   *    memory:chrome:all_processes:source:X:B:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:B in all process dumps in global dump 1,
   *          ...
   *          sum of X:B in all process dumps in global dump N,
   *    ]
   *
   *    memory:chrome:all_processes:source:X:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A+X:B in all process dumps in global dump 1,
   *          ...
   *          sum of X:A+X:B in all process dumps in global dump N,
   *    ]
   *
   *    memory:chrome:all_processes:source:Y:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of Y in all process dumps in global dump 1,
   *          ...
   *          sum of Y in all process dumps in global dump N
   *    ]
   *
   *    memory:chrome:all_processes:source:proportional_resident_size :
   *        Numeric aggregated over [
   *          sum of X:A+X:B+Y in all process dumps in global dump 1,
   *          ...
   *          sum of X:A+X:B+Y in all process dumps in global dump N
   *        ]
   *
   * where global dumps 1 to N are the global dumps associated with the given
   * browser.
   *
   * @param {!Map<string, !Array<!tr.model.GlobalMemoryDump>}
   *     browserNameToGlobalDumps Map from browser names to arrays of global
   *     memory dumps. The generic values will be extracted from the associated
   *     process memory dumps.
   * @param {!function(!tr.model.GlobalMemoryDump): boolean}
   *     customGlobalDumpFilter Predicate for filtering global memory dumps.
   * @param {!function(
   *     !tr.model.ProcessMemoryDump,
   *     !function(!{
   *         source: string,
   *         componentPath: (!Array<string>|undefined),
   *         propertyName: (string|undefined),
   *         value: (!tr.v.ScalarNumeric|number|undefined),
   *         unit: (!tr.v.Unit|undefined),
   *         descriptionPrefixBuilder: (!function(!Array<string>): string)
   *     }))}
   *     customProcessDumpValueExtractor Callback for extracting values from a
   *     process memory dump.
   * @param {!function(!tr.b.MultiDimensionalViewNode)}
   *     customComponentTreeModifier Callback applied to every component tree
   *     wrt each process name.
   * @param {!tr.v.ValueSet} values List of values to which the
   *     resulting aggregated values are added.
   */
  function addMemoryDumpValues(browserNameToGlobalDumps, customGlobalDumpFilter,
      customProcessDumpValueExtractor, customComponentTreeModifier,
      values) {
    browserNameToGlobalDumps.forEach(function(globalDumps, browserName) {
      var filteredGlobalDumps = globalDumps.filter(customGlobalDumpFilter);
      var sourceToPropertyToData = extractDataFromGlobalDumps(
          filteredGlobalDumps, customProcessDumpValueExtractor);
      reportDataAsValues(sourceToPropertyToData, browserName,
          customComponentTreeModifier, values);
    });
  }

  /**
   * For each global memory dump in |globalDumps|, calculate per-process-name
   * sums of values extracted by |customProcessDumpValueExtractor| from the
   * associated process memory dumps.
   *
   * This function returns the following nested map structure:
   *
   *  Source name (Map key, e.g. 'reported_by_os')
   *    -> Property name (Map key, e.g. 'proportional_resident_size')
   *      -> {unit, descriptionPrefixBuilder, processAndComponentTreeBuilder}
   *
   *  where |processAndComponentTreeBuilder| is a
   *  tr.b.MultiDimensionalViewBuilder:
   *
   *  Browser name (0th dimension key, e.g. 'webview') x
   *    -> Component path (1st dimension keys, e.g. ['system', 'native_heap'])
   *      -> Sum of value over the processes (number).
   *
   * See addMemoryDumpValues for more details.
   */
  function extractDataFromGlobalDumps(
      globalDumps, customProcessDumpValueExtractor) {
    var sourceToPropertyToData = new Map();
    var dumpCount = globalDumps.length;
    globalDumps.forEach(function(globalDump, dumpIndex) {
      tr.b.iterItems(globalDump.processMemoryDumps, function(_, processDump) {
        extractDataFromProcessDump(
            processDump, sourceToPropertyToData, dumpIndex, dumpCount,
            customProcessDumpValueExtractor);
      });
    });
    return sourceToPropertyToData;
  }

  function extractDataFromProcessDump(processDump, sourceToPropertyToData,
      dumpIndex, dumpCount, customProcessDumpValueExtractor) {
    // Process name is typically 'browser', 'renderer', etc.
    var rawProcessName = processDump.process.name;
    var processNamePath = [canonicalizeProcessName(rawProcessName)];

    customProcessDumpValueExtractor(
        processDump,
        function addProcessScalar(spec) {
          if (spec.value === undefined)
            return;

          var component = spec.component || [];
          function createDetailsForErrorMessage() {
            var propertyUserFriendlyName =
                spec.property === undefined ? '(undefined)' : spec.property;
            var componentUserFriendlyName =
                component.length === 0 ? '(empty)' : component.join(':');
            return ['source=', spec.source, ', property=',
                propertyUserFriendlyName, ', component=',
                componentUserFriendlyName, ' in ',
                processDump.process.userFriendlyName].join('');
          }

          var value, unit;
          if (spec.value instanceof ScalarNumeric) {
            value = spec.value.value;
            unit = spec.value.unit;
            if (spec.unit !== undefined) {
              throw new Error('ScalarNumeric value for ' +
                  createDetailsForErrorMessage() + ' already specifies a unit');
            }
          } else {
            value = spec.value;
            unit = spec.unit;
          }

          var propertyToData = sourceToPropertyToData.get(spec.source);
          if (propertyToData === undefined) {
            propertyToData = new Map();
            sourceToPropertyToData.set(spec.source, propertyToData);
          }

          var data = propertyToData.get(spec.property);
          if (data === undefined) {
            data = {
              processAndComponentTreeBuilder:
                  new tr.b.MultiDimensionalViewBuilder(
                      2 /* dimensions (process name and component path) */,
                      dumpCount /* valueCount */),
              unit: unit,
              descriptionPrefixBuilder: spec.descriptionPrefixBuilder
            };
            propertyToData.set(spec.property, data);
          } else if (data.unit !== unit) {
            throw new Error('Multiple units provided for ' +
                createDetailsForErrorMessage() + ':' +
                data.unit.unitName + ' and ' + unit.unitName);
          } else if (data.descriptionPrefixBuilder !==
                     spec.descriptionPrefixBuilder) {
            throw new Error(
                'Multiple description prefix builders provided for' +
                createDetailsForErrorMessage());
          }

          var values = new Array(dumpCount);
          values[dumpIndex] = value;

          data.processAndComponentTreeBuilder.addPath(
              [processNamePath, component] /* path */, values,
              tr.b.MultiDimensionalViewBuilder.ValueKind.TOTAL /* valueKind */);
        });
  }

  function reportDataAsValues(sourceToPropertyToData, browserName,
      customComponentTreeModifier, values) {
    // For each source name (e.g. 'reported_by_os')...
    sourceToPropertyToData.forEach(function(propertyToData, sourceName) {
      // For each property name (e.g. 'effective_size')...
      propertyToData.forEach(function(data, propertyName) {
        var tree = data.processAndComponentTreeBuilder.buildTopDownTreeView();
        var unit = data.unit;
        var descriptionPrefixBuilder = data.descriptionPrefixBuilder;

        // Total over 'all' processes...
        customComponentTreeModifier(tree);
        reportComponentDataAsValues(browserName, sourceName,
            propertyName, 'all_processes', [] /* componentPath */, tree,
            unit, descriptionPrefixBuilder, values);

        // For each process name (e.g. 'renderer')...
        tree.children[0].forEach(function(processTree, processName) {
          if (processTree.children[0].size > 0) {
            throw new Error('Multi-dimensional view node for source=' +
                sourceName + ', property=' +
                (propertyName === undefined ? '(undefined)' : propertyName) +
                ', process=' + processName +
                ' has children wrt the process name dimension');
          }
          customComponentTreeModifier(processTree);
          reportComponentDataAsValues(browserName, sourceName,
              propertyName, processName, [] /* componentPath */, processTree,
              unit, descriptionPrefixBuilder, values);
        });
      });
    });
  }

  /**
   * For the given |browserName| (e.g. 'chrome'), |processName|
   * (e.g. 'gpu_process'), |propertyName| (e.g. 'effective_size'),
   * |componentPath| (e.g. ['v8']), add a tr.v.Numeric with |unit| aggregating
   * the total values of the associated |componentNode| across all timestamps
   * (corresponding to global memory dumps associated with the given browser)
   * to |values|.
   *
   * See addMemoryDumpValues for more details.
   */
  function reportComponentDataAsValues(
      browserName, sourceName, propertyName, processName, componentPath,
      componentNode, unit, descriptionPrefixBuilder, values) {
    // Construct the name of the memory value.
    var nameParts = ['memory', browserName, processName, sourceName].concat(
        componentPath);
    if (propertyName !== undefined)
      nameParts.push(propertyName);
    var name = nameParts.join(':');

    // Build the underlying numeric for the memory value.
    var numeric = buildMemoryNumericFromNode(componentNode, unit);

    // Build the options for the memory value.
    var description = [
      descriptionPrefixBuilder(componentPath, processName),
      'in',
      convertBrowserNameToUserFriendlyName(browserName)
    ].join(' ');
    var options = { description: description };

    // Report the memory value.
    values.addValue(new tr.v.NumericValue(name, numeric, options));

    // Recursively report memory values for sub-components.
    var depth = componentPath.length;
    componentPath.push(undefined);
    componentNode.children[1].forEach(function(childNode, childName) {
      componentPath[depth] = childName;
      reportComponentDataAsValues(
          browserName, sourceName, propertyName, processName, componentPath,
          childNode, unit, descriptionPrefixBuilder, values);
    });
    componentPath.pop();
  }

  /**
   * Create a memory tr.v.Numeric (histogram) with |unit| and add all total
   * values in |node| to it.
   */
  function buildMemoryNumericFromNode(node, unit) {
    var numeric = MEMORY_NUMERIC_BUILDER_MAP.get(unit).build();
    node.values.forEach(v => numeric.add(v.total));
    return numeric;
  }

  tr.metrics.MetricRegistry.register(memoryMetric, {
    supportsRangeOfInterest: true
  });

  return {
    memoryMetric: memoryMetric
  };
});
