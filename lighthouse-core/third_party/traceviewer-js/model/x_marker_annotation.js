"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./annotation.js");
require("../ui/annotations/x_marker_annotation_view.js");

'use strict';

global.tr.exportTo('tr.model', function () {

  function XMarkerAnnotation(timestamp) {
    tr.model.Annotation.apply(this, arguments);

    this.timestamp = timestamp;
    this.strokeStyle = 'rgba(0, 0, 255, 0.5)';
  }

  XMarkerAnnotation.fromDict = function (dict) {
    return new XMarkerAnnotation(dict.args.timestamp);
  };

  XMarkerAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    toDict: function () {
      return {
        typeName: 'xmarker',
        args: {
          timestamp: this.timestamp
        }
      };
    },

    createView_: function (viewport) {
      return new tr.ui.annotations.XMarkerAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(XMarkerAnnotation, { typeName: 'xmarker' });

  return {
    XMarkerAnnotation: XMarkerAnnotation
  };
});