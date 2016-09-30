"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/range.js");
require("./metric_registry.js");
require("../value/histogram.js");

'use strict';

global.tr.exportTo('tr.metrics', function() {
  function sampleMetric(values, model) {
    var hist = new tr.v.Histogram(
        'foo', tr.b.Unit.byName.sizeInBytes_smallerIsBetter);
    hist.addSample(9);
    hist.addSample(91, {bar: new tr.v.d.Generic({hello: 42})});

    for (var expectation of model.userModel.expectations) {
      if (expectation instanceof tr.model.um.ResponseExpectation) {
      } else if (expectation instanceof tr.model.um.AnimationExpectation) {
      } else if (expectation instanceof tr.model.um.IdleExpectation) {
      } else if (expectation instanceof tr.model.um.LoadExpectation) {
      }
    }

    var chromeHelper = model.getOrCreateHelper(
        tr.model.helpers.ChromeModelHelper);

    tr.b.iterItems(model.processes, function(pid, process) {
    });

    values.addHistogram(hist);
  }

  tr.metrics.MetricRegistry.register(sampleMetric);

  return {
    sampleMetric: sampleMetric
  };
});
