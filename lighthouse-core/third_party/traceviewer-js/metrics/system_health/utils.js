"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../model/user_model/user_expectation.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  // Returns a weight for this score.
  // score should be a number between 0 and 1 inclusive.
  // This function is expected to be passed to tr.b.Statistics.weightedMean as
  // its weightCallback.
  function perceptualBlend(ir, index, score) {
    // Lower scores are exponentially more important than higher scores
    // due to the Peak-end rule.
    // Other than that general rule, there is no specific reasoning behind this
    // specific formula -- it is fairly arbitrary.
    return Math.exp(1 - score);
  }

  function filterExpectationsByRange(irs, opt_range) {
    var filteredExpectations = [];
    irs.forEach(function(ir) {
      if (!(ir instanceof tr.model.um.UserExpectation))
        return;

      if (!opt_range ||
          opt_range.intersectsExplicitRangeInclusive(ir.start, ir.end))
        filteredExpectations.push(ir);
    });
    return filteredExpectations;
  }

  return {
    perceptualBlend: perceptualBlend,
    filterExpectationsByRange: filterExpectationsByRange
  };
});
