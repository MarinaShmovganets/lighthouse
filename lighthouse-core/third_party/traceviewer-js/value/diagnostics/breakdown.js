"use strict";
/**
Copyright 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./related_value_map.js");

'use strict';

global.tr.exportTo('tr.v.d', function() {
  class Breakdown extends tr.v.d.Diagnostic {
    constructor() {
      super();
      this.values_ = new Map();
      this.colorScheme = undefined;
    }

    /**
     * Add a Value by an explicit name to this map.
     *
     * @param {string} name
     * @param {!(tr.v.d.ValueRef|tr.v.Value)} value
     */
    set(name, value) {
      if (typeof name !== 'string' ||
          typeof value !== 'number') {
        throw new Error('Breakdown maps from strings to numbers');
      }
      this.values_.set(name, value);
    }

    /**
     * @param {string} name
     * @return {number}
     */
    get(name) {
      return this.values_.get(name) || 0;
    }

    *[Symbol.iterator]() {
      for (var pair of this.values_)
        yield pair;
    }

    asDictInto_(d) {
      d.values = {};
      for (var [name, value] of this)
        d.values[name] = value;
      if (this.colorScheme)
        d.colorScheme = this.colorScheme;
    }

    static fromDict(d) {
      var breakdown = new Breakdown();
      tr.b.iterItems(d.values, (name, value) => breakdown.set(name, value));
      if (d.colorScheme)
        breakdown.colorScheme = d.colorScheme;
      return breakdown;
    }
  }

  tr.v.d.Diagnostic.register(Breakdown, {
    elementName: 'tr-v-ui-breakdown-span'
  });

  return {
    Breakdown: Breakdown
  };
});
