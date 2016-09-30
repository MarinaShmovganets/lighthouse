"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/



/**
  Include all Diagnostic subclasses here so that DiagnosticMap.addDicts() and
  DiagnosticMap.fromDict() always have access to all subclasses in the
  Diagnostic registry.
**/

require("./breakdown.js");
require("./generic.js");
require("./iteration_info.js");
require("./related_event_set.js");
require("./related_histogram_breakdown.js");
require("./related_value_map.js");
require("./related_value_set.js");
require("./scalar.js");

'use strict';

global.tr.exportTo('tr.v.d', function() {
  class DiagnosticMap extends Map {
    /**
     * Add a new Diagnostic to this map.
     *
     * @param {string} name
     * @param {!tr.v.d.Diagnostic} diagnostic
     */
    set(name, diagnostic) {
      if (typeof(name) !== 'string')
        throw new Error('name must be string, not ' + name);

      if (!(diagnostic instanceof tr.v.d.Diagnostic))
        throw new Error('Must be instanceof Diagnostic: ' + diagnostic);

      Map.prototype.set.call(this, name, diagnostic);
    }

    /**
     * Add Diagnostics from a dictionary of dictionaries.
     *
     * @param {Object} dict
     */
    addDicts(dict) {
      tr.b.iterItems(dict, function(name, diagnosticDict) {
        this.set(name, tr.v.d.Diagnostic.fromDict(diagnosticDict));
      }, this);
    }

    asDict() {
      var dict = {};
      for (var [name, diagnostic] of this) {
        dict[name] = diagnostic.asDict();
      }
      return dict;
    }

    static fromDict(d) {
      var diagnostics = new DiagnosticMap();
      diagnostics.addDicts(d);
      return diagnostics;
    }

    static fromObject(obj) {
      var diagnostics = new DiagnosticMap();
      tr.b.iterItems(obj, function(name, diagnostic) {
        diagnostics.set(name, diagnostic);
      });
      return diagnostics;
    }
  }

  return {
    DiagnosticMap: DiagnosticMap
  };
});
