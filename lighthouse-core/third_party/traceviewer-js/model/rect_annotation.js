"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./location.js");
require("./annotation.js");
require("../ui/annotations/rect_annotation_view.js");

'use strict';

global.tr.exportTo('tr.model', function() {

  function RectAnnotation(start, end) {
    tr.model.Annotation.apply(this, arguments);

    this.startLocation_ = start; // Location of top-left corner.
    this.endLocation_ = end; // Location of bottom-right corner.
    this.fillStyle = 'rgba(255, 180, 0, 0.3)';
  }

  RectAnnotation.fromDict = function(dict) {
    var args = dict.args;
    var startLoc =
        new tr.model.Location(args.start.xWorld, args.start.yComponents);
    var endLoc =
        new tr.model.Location(args.end.xWorld, args.end.yComponents);
    return new tr.model.RectAnnotation(startLoc, endLoc);
  }

  RectAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    get startLocation() {
      return this.startLocation_;
    },

    get endLocation() {
      return this.endLocation_;
    },

    toDict: function() {
      return {
        typeName: 'rect',
        args: {
          start: this.startLocation.toDict(),
          end: this.endLocation.toDict()
        }
      };
    },

    createView_: function(viewport) {
      return new tr.ui.annotations.RectAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(RectAnnotation, {typeName: 'rect'});

  return {
    RectAnnotation: RectAnnotation
  };
});
