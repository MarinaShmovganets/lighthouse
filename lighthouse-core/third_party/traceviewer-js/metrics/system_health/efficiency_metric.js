/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/statistics.js");
require("../metric_registry.js");
require("./utils.js");
require("../../model/user_model/animation_expectation.js");
require("../../model/user_model/idle_expectation.js");
require("../../value/numeric.js");
require("../../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  var UNIT = tr.v.Unit.byName.normalizedPercentage_biggerIsBetter;

  var DESCRIPTION = 'Normalized CPU budget consumption';

  function efficiencyMetric(values, model) {
    var scores = [];

    model.userModel.expectations.forEach(function(ue) {
      var options = {};
      options.description = DESCRIPTION;

      var score = undefined;

      if ((ue.totalCpuMs === undefined) ||
          (ue.totalCpuMs == 0))
        return;

      var cpuFractionBudget = tr.b.Range.fromExplicitRange(0.5, 1.5);

      if (ue instanceof tr.model.um.IdleExpectation) {
        cpuFractionBudget = tr.b.Range.fromExplicitRange(0.1, 1);
      } else if (ue instanceof tr.model.um.AnimationExpectation) {
        cpuFractionBudget = tr.b.Range.fromExplicitRange(1, 2);
      }

      var cpuMsBudget = tr.b.Range.fromExplicitRange(
          ue.duration * cpuFractionBudget.min,
          ue.duration * cpuFractionBudget.max);
      var normalizedCpu = tr.b.normalize(
          ue.totalCpuMs, cpuMsBudget.min, cpuMsBudget.max);
      score = 1 - tr.b.clamp(normalizedCpu, 0, 1);

      scores.push(score);

      values.addValue(new tr.v.NumericValue(
          'efficiency', new tr.v.ScalarNumeric(UNIT, score), options));
    });

    // Manually reduce scores.
    // https://github.com/catapult-project/catapult/issues/2036

    var options = {};
    options.description = DESCRIPTION;
    var overallScore = tr.b.Statistics.weightedMean(
        scores, tr.metrics.sh.perceptualBlend);
    if (overallScore === undefined)
      return;

    values.addValue(new tr.v.NumericValue(
        'efficiency', new tr.v.ScalarNumeric(UNIT, overallScore), options));
  }

  tr.metrics.MetricRegistry.register(efficiencyMetric);

  return {
    efficiencyMetric: efficiencyMetric
  };
});
