/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../metric_registry.js");
require("../../value/histogram.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  // Use a lower bound of 0.01 for the metric boundaries (when no CPU time
  // is consumed) and an upper bound of 50 (fifty cores are all active
  // for the entire time). We can't use zero exactly for the lower bound with an
  // exponential histogram.
  var CPU_TIME_PERCENTAGE_BOUNDARIES =
      tr.v.HistogramBinBoundaries.createExponential(0.01, 50, 200);

  /**
   * This metric measures total CPU time for Chrome processes, per second of
   *   clock time.
   * This metric requires only the 'toplevel' tracing category.
   *
   * @param {!tr.v.ValueSet} values
   * @param {!tr.model.Model} model
   * @param {!Object=} opt_options
   */
  function cpuTimeMetric(values, model, opt_options) {
    var rangeOfInterest = model.bounds;
    if (opt_options && opt_options.rangeOfInterest)
      rangeOfInterest = opt_options.rangeOfInterest;
    var allProcessCpuTime = 0;

    for (var pid in model.processes) {
      var process = model.processes[pid];
      var processCpuTime = 0;
      for (var tid in process.threads) {
        var thread = process.threads[tid];
        var threadCpuTime = 0;
        thread.sliceGroup.topLevelSlices.forEach(function(slice) {
          if (slice.duration === 0)
            return;
          if (!slice.cpuDuration)
            return;
          var sliceRange = tr.b.Range.fromExplicitRange(slice.start, slice.end);
          var intersection = rangeOfInterest.findIntersection(sliceRange);
          var fractionOfSliceInsideRangeOfInterest =
              intersection.duration / slice.duration;

          // We assume that if a slice doesn't lie entirely inside the range of
          // interest, then the CPU time is evenly distributed inside of the
          // slice.
          threadCpuTime +=
              slice.cpuDuration * fractionOfSliceInsideRangeOfInterest;
        });
        processCpuTime += threadCpuTime;
      }
      allProcessCpuTime += processCpuTime;
    }

    // Normalize cpu time by clock time.
    var normalizedAllProcessCpuTime = 0;
    if (rangeOfInterest.duration > 0) {
      normalizedAllProcessCpuTime =
          allProcessCpuTime / rangeOfInterest.duration;
    }

    var unit = tr.b.Unit.byName.normalizedPercentage_smallerIsBetter;
    var cpuTimeHist = new tr.v.Histogram(
        'cpu_time_percentage', unit, CPU_TIME_PERCENTAGE_BOUNDARIES);
    cpuTimeHist.description =
        'Percent CPU utilization, normalized against a single core. Can be ' +
        'greater than 100% if machine has multiple cores.';
    cpuTimeHist.addSample(normalizedAllProcessCpuTime);
    values.addHistogram(cpuTimeHist);
  }

  tr.metrics.MetricRegistry.register(cpuTimeMetric, {
    supportsRangeOfInterest: true
  });

  return {
    cpuTimeMetric: cpuTimeMetric,
  };
});
