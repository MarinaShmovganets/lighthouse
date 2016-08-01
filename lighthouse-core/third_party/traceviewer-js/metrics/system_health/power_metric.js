/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/statistics.js");
require("../metric_registry.js");
require("./clock_sync_latency_metric.js");
require("../../value/numeric.js");
require("../../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {

  var IDEAL_FRAME_RATE = 60;
  var IDEAL_FRAME_DURATION = 1000 / IDEAL_FRAME_RATE;

  function energyConsumedPerFrame(valueList, model) {
    var frameEnergyConsumed = tr.v.NumericBuilder.createLinear(
        tr.v.Unit.byName.energyInJoules_smallerIsBetter,
        tr.b.Range.fromExplicitRange(0, .5), 20).build();
    var frameStartTs = parseFloat(model.device.powerSeries.samples[0].start);
    while (model.device.powerSeries.getSamplesWithinRange(
        frameStartTs, frameStartTs + IDEAL_FRAME_DURATION).length) {
      var currentFrameEnergy = model.device.powerSeries.getEnergyConsumed(
          frameStartTs, frameStartTs + IDEAL_FRAME_DURATION);
      frameStartTs += IDEAL_FRAME_DURATION;
      frameEnergyConsumed.add(currentFrameEnergy);
    }

    valueList.addValue(new tr.v.NumericValue(
        'energy_consumed_per_frame', frameEnergyConsumed,
        {description: 'Energy consumption per frame in joules'}));
  }

  function powerMetric(valueList, model) {
    // TODO(alexandermont): Once it's possible to specify multiple metrics
    // in a Telemetry benchmark, separate out this metric from the power
    // metric and have the benchmark use both.
    // (See: https://github.com/catapult-project/catapult/issues/2430.)
    if (!model.device.powerSeries)
      return;
    energyConsumedPerFrame(valueList, model);
  }

  tr.metrics.MetricRegistry.register(powerMetric);

  return {
    powerMetric: powerMetric
  };
});
