"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/extension_registry.js");
require("../base/guid.js");

'use strict';

global.tr.exportTo('tr.model', function() {
  /**
   * Annotation is a base class that represents all annotation objects that
   * can be drawn on the timeline.
   *
   * @constructor
   */
  function Annotation() {
    this.guid_ = tr.b.GUID.allocateSimple();
    this.view_ = undefined;
  };

  Annotation.fromDictIfPossible = function(args) {
    if (args.typeName === undefined)
      throw new Error('Missing typeName argument');

    var typeInfo = Annotation.findTypeInfoMatching(function(typeInfo) {
      return typeInfo.metadata.typeName === args.typeName;
    });

    if (typeInfo === undefined)
      return undefined;

    return typeInfo.constructor.fromDict(args);
  };

  Annotation.fromDict = function() {
    throw new Error('Not implemented');
  };

  Annotation.prototype = {
    get guid() {
      return this.guid_;
    },

    // Invoked by trace model when this annotation is removed.
    onRemove: function() {
    },

    toDict: function() {
      throw new Error('Not implemented');
    },

    getOrCreateView: function(viewport) {
      if (!this.view_)
        this.view_ = this.createView_(viewport);
      return this.view_;
    },

    createView_: function() {
      throw new Error('Not implemented');
    }
  };

  var options = new tr.b.ExtensionRegistryOptions(tr.b. BASIC_REGISTRY_MODE);
  tr.b.decorateExtensionRegistry(Annotation, options);

  Annotation.addEventListener('will-register', function(e) {
    if (!e.typeInfo.constructor.hasOwnProperty('fromDict'))
      throw new Error('Must have fromDict method');

    if (!e.typeInfo.metadata.typeName)
      throw new Error('Registered Annotations must provide typeName');
  });

  return {
    Annotation: Annotation
  };
});
