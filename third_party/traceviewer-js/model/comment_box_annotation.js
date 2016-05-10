/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./location.js");
require("./annotation.js");
require("./rect_annotation.js");
require("../ui/annotations/comment_box_annotation_view.js");

'use strict';

global.tr.exportTo('tr.model', function() {

  function CommentBoxAnnotation(location, text) {
    tr.model.Annotation.apply(this, arguments);

    this.location = location;
    this.text = text;
  }

  CommentBoxAnnotation.fromDict = function(dict) {
    var args = dict.args;
    var location =
        new tr.model.Location(args.location.xWorld, args.location.yComponents);
    return new tr.model.CommentBoxAnnotation(location, args.text);
  };

  CommentBoxAnnotation.prototype = {
    __proto__: tr.model.Annotation.prototype,

    onRemove: function() {
      this.view_.removeTextArea();
    },

    toDict: function() {
      return {
        typeName: 'comment_box',
        args: {
          text: this.text,
          location: this.location.toDict()
        }
      };
    },

    createView_: function(viewport) {
      return new tr.ui.annotations.CommentBoxAnnotationView(viewport, this);
    }
  };

  tr.model.Annotation.register(
      CommentBoxAnnotation, {typeName: 'comment_box'});

  return {
    CommentBoxAnnotation: CommentBoxAnnotation
  };
});
