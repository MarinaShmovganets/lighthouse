/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../metric_registry.js");
require("./utils.js");
require("../../value/numeric.js");
require("../../value/value.js");

'use strict';

global.tr.exportTo('tr.metrics.sh', function() {
  function webviewStartupMetric(values, model) {
    for (var slice of model.getDescendantEvents()) {
      // WebViewStartupInterval is the title of the section of code that is
      // entered (via android.os.Trace.beginSection) when WebView is started
      // up. This value is defined in TelemetryActivity.java.
      if (!(slice instanceof tr.model.Slice))
        continue;
      if (slice.title === 'WebViewStartupInterval') {
        values.addValue(new tr.v.NumericValue(
            'webview_startup_wall_time',
            new tr.v.ScalarNumeric(
                tr.v.Unit.byName.timeDurationInMs_smallerIsBetter,
                slice.duration),
            { description: 'WebView startup wall time' }));
        values.addValue(new tr.v.NumericValue(
            'webview_startup_cpu_time',
            new tr.v.ScalarNumeric(
                tr.v.Unit.byName.timeDurationInMs_smallerIsBetter,
                slice.cpuDuration),
            { description: 'WebView startup CPU time' }));
      }
      // WebViewBlankUrlLoadInterval is the title of the section of code
      // that is entered (via android.os.Trace.beginSection) when WebView
      // is started up. This value is defined in TelemetryActivity.java.
      if (slice.title === 'WebViewBlankUrlLoadInterval') {
        values.addValue(new tr.v.NumericValue(
            'webview_url_load_wall_time',
            new tr.v.ScalarNumeric(
                tr.v.Unit.byName.timeDurationInMs_smallerIsBetter,
                slice.duration),
            { description: 'WebView blank URL load wall time' }));
        values.addValue(new tr.v.NumericValue(
            'webview_url_load_cpu_time',
            new tr.v.ScalarNumeric(
                tr.v.Unit.byName.timeDurationInMs_smallerIsBetter,
                slice.cpuDuration),
            { description: 'WebView blank URL load CPU time' }));
      }
    }
  };

  tr.metrics.MetricRegistry.register(webviewStartupMetric);

  return {
    webviewStartupMetric: webviewStartupMetric
  };
});
