"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/range.js");
require("../../base/unit.js");
require("../metric_registry.js");
require("../v8/utils.js");
require("../../value/histogram.js");

'use strict';

global.tr.exportTo('tr.metrics.blink', function() {
  // Maps the Blink GC events in timeline to telemetry friendly names.
  var BLINK_GC_EVENTS = {
    'BlinkGCMarking': 'blink-gc-marking',
    'ThreadState::completeSweep': 'blink-gc-complete-sweep',
    'ThreadState::performIdleLazySweep': 'blink-gc-idle-lazy-sweep'
  };

  function isBlinkGarbageCollectionEvent(event) {
    return event.title in BLINK_GC_EVENTS;
  }

  function blinkGarbageCollectionEventName(event) {
    return BLINK_GC_EVENTS[event.title];
  }

  function blinkGcMetric(values, model) {
    addDurationOfTopEvents(values, model);
    addTotalDurationOfTopEvents(values, model);
    addIdleTimesOfTopEvents(values, model);
    addTotalIdleTimesOfTopEvents(values, model);
  }

  tr.metrics.MetricRegistry.register(blinkGcMetric);

  var timeDurationInMs_smallerIsBetter =
      tr.b.Unit.byName.timeDurationInMs_smallerIsBetter;
  var percentage_biggerIsBetter =
      tr.b.Unit.byName.normalizedPercentage_biggerIsBetter;

  // 0.1 steps from 0 to 20 since it is the most common range.
  // Exponentially increasing steps from 20 to 200.
  var CUSTOM_BOUNDARIES = tr.v.HistogramBinBoundaries.createLinear(0, 20, 200)
    .addExponentialBins(200, 100);

  function createNumericForTopEventTime(name) {
    var n = new tr.v.Histogram(name,
        timeDurationInMs_smallerIsBetter, CUSTOM_BOUNDARIES);
    n.customizeSummaryOptions({
        avg: true,
        count: true,
        max: true,
        min: false,
        std: true,
        sum: true,
        percentile: [0.90]});
    return n;
  }

  function createNumericForIdleTime(name) {
    var n = new tr.v.Histogram(name,
        timeDurationInMs_smallerIsBetter, CUSTOM_BOUNDARIES);
    n.customizeSummaryOptions({
        avg: true,
        count: false,
        max: true,
        min: false,
        std: false,
        sum: true,
        percentile: []
    });
    return n;
  }

  function createPercentage(name, numerator, denominator) {
    var histogram = new tr.v.Histogram(name, percentage_biggerIsBetter);
    if (denominator === 0)
      histogram.addSample(0);
    else
      histogram.addSample(numerator / denominator);
    return histogram;
  }

  /**
   * Example output:
   * - blink-gc-marking.
   */
  function addDurationOfTopEvents(values, model) {
    tr.metrics.v8.utils.groupAndProcessEvents(model,
      isBlinkGarbageCollectionEvent,
      blinkGarbageCollectionEventName,
      function(name, events) {
        var cpuDuration = createNumericForTopEventTime(name);
        events.forEach(function(event) {
          cpuDuration.addSample(event.cpuDuration);
        });
        values.addHistogram(cpuDuration);
      }
    );
  }

  /**
   * Example output:
   * - blink-gc-total
   */
  function addTotalDurationOfTopEvents(values, model) {
    tr.metrics.v8.utils.groupAndProcessEvents(model,
      isBlinkGarbageCollectionEvent,
      event => 'blink-gc-total',
      function(name, events) {
        var cpuDuration = createNumericForTopEventTime(name);
        events.forEach(function(event) {
          cpuDuration.addSample(event.cpuDuration);
        });
        values.addHistogram(cpuDuration);
      }
    );
  }

  /**
   * Example output:
   * - blink-gc-marking_idle_deadline_overrun,
   * - blink-gc-marking_outside_idle,
   * - blink-gc-marking_percentage_idle.
   */
  function addIdleTimesOfTopEvents(values, model) {
    tr.metrics.v8.utils.groupAndProcessEvents(model,
      isBlinkGarbageCollectionEvent,
      blinkGarbageCollectionEventName,
      function(name, events) {
        addIdleTimes(values, model, name, events);
      }
    );
  }

  /**
   * Example output:
   * - blink-gc-total_idle_deadline_overrun,
   * - blink-gc-total_outside_idle,
   * - blink-gc-total_percentage_idle.
   */
  function addTotalIdleTimesOfTopEvents(values, model) {
    tr.metrics.v8.utils.groupAndProcessEvents(model,
      isBlinkGarbageCollectionEvent,
      event => 'blink-gc-total',
      function(name, events) {
        addIdleTimes(values, model, name, events);
      }
    );
  }

  function addIdleTimes(values, model, name, events) {
    var cpuDuration = createNumericForIdleTime(name + '_cpu');
    var insideIdle = createNumericForIdleTime(name + '_inside_idle');
    var outsideIdle = createNumericForIdleTime(name + '_outside_idle');
    var idleDeadlineOverrun = createNumericForIdleTime(
        name + '_idle_deadline_overrun');
    events.forEach(function(event) {
      var idleTask = tr.metrics.v8.utils.findParent(
          event, tr.metrics.v8.utils.isIdleTask);
      var inside = 0;
      var overrun = 0;
      if (idleTask) {
        var allottedTime = idleTask['args']['allotted_time_ms'];
        if (event.duration > allottedTime) {
          overrun = event.duration - allottedTime;
          // Don't count time over the deadline as being inside idle time.
          // Since the deadline should be relative to wall clock we
          // compare allotted_time_ms with wall duration instead of thread
          // duration, and then assume the thread duration was inside idle
          // for the same percentage of time.
          inside = event.cpuDuration * allottedTime / event.duration;
        } else {
          inside = event.cpuDuration;
        }
      }
      cpuDuration.addSample(event.cpuDuration);
      insideIdle.addSample(inside);
      outsideIdle.addSample(event.cpuDuration - inside);
      idleDeadlineOverrun.addSample(overrun);
    });
    values.addHistogram(idleDeadlineOverrun);
    values.addHistogram(outsideIdle);
    var percentage = createPercentage(
        name + '_percentage_idle', insideIdle.sum, cpuDuration.sum);
    values.addHistogram(percentage);
  }

  return {
    blinkGcMetric: blinkGcMetric
  };
});
