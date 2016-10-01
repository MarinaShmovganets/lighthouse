"use strict";
/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/guid.js");
require("../base/range.js");
require("./async_slice.js");
require("./event_container.js");

'use strict';

/**
 * @fileoverview Provides the AsyncSliceGroup class.
 */
global.tr.exportTo('tr.model', function () {
  /**
   * A group of AsyncSlices associated with a thread.
   * @constructor
   * @extends {tr.model.EventContainer}
   */
  function AsyncSliceGroup(parentContainer, opt_name) {
    tr.model.EventContainer.call(this);
    this.parentContainer_ = parentContainer;
    this.slices = [];
    this.name_ = opt_name;
    this.viewSubGroups_ = undefined;
  }

  AsyncSliceGroup.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get parentContainer() {
      return this.parentContainer_;
    },

    get model() {
      return this.parentContainer_.parent.model;
    },

    get stableId() {
      return this.parentContainer_.stableId + '.AsyncSliceGroup';
    },

    getSettingsKey: function () {
      if (!this.name_) return undefined;
      var parentKey = this.parentContainer_.getSettingsKey();
      if (!parentKey) return undefined;
      return parentKey + '.' + this.name_;
    },

    /**
     * Helper function that pushes the provided slice onto the slices array.
     */
    push: function (slice) {
      slice.parentContainer = this.parentContainer;
      this.slices.push(slice);
      return slice;
    },

    /**
     * @return {Number} The number of slices in this group.
     */
    get length() {
      return this.slices.length;
    },

    /**
     * Shifts all the timestamps inside this group forward by the amount
     * specified, including all nested subSlices if there are any.
     */
    shiftTimestampsForward: function (amount) {
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        slice.start = slice.start + amount;
        // Shift all nested subSlices recursively.
        var shiftSubSlices = function (subSlices) {
          if (subSlices === undefined || subSlices.length === 0) return;
          for (var sJ = 0; sJ < subSlices.length; sJ++) {
            subSlices[sJ].start += amount;
            shiftSubSlices(subSlices[sJ].subSlices);
          }
        };
        shiftSubSlices(slice.subSlices);
      }
    },

    /**
     * Updates the bounds for this group based on the slices it contains.
     */
    updateBounds: function () {
      this.bounds.reset();
      for (var i = 0; i < this.slices.length; i++) {
        this.bounds.addValue(this.slices[i].start);
        this.bounds.addValue(this.slices[i].end);
      }
    },

    /**
     * Gets the sub-groups in this A-S-G defined by the group titles.
     *
     * @return {Array} An array of AsyncSliceGroups where each group has
     * slices that started on the same thread.
     */
    get viewSubGroups() {
      if (this.viewSubGroups_ === undefined) {
        var prefix = '';
        if (this.name !== undefined) prefix = this.name + '.';else prefix = '';

        var subGroupsByTitle = {};
        for (var i = 0; i < this.slices.length; ++i) {
          var slice = this.slices[i];
          var subGroupTitle = slice.viewSubGroupTitle;
          if (!subGroupsByTitle[subGroupTitle]) {
            subGroupsByTitle[subGroupTitle] = new AsyncSliceGroup(this.parentContainer_, prefix + subGroupTitle);
          }
          subGroupsByTitle[subGroupTitle].push(slice);
        }
        this.viewSubGroups_ = tr.b.dictionaryValues(subGroupsByTitle);
        this.viewSubGroups_.sort(function (a, b) {
          return a.slices[0].compareTo(b.slices[0]);
        });
      }
      return this.viewSubGroups_;
    },

    findTopmostSlicesInThisContainer: function* (eventPredicate, opt_this) {
      for (var slice of this.slices) {
        if (slice.isTopLevel) {
          yield* slice.findTopmostSlicesRelativeToThisSlice(eventPredicate, opt_this);
        }
      }
    },

    childEvents: function* () {
      // Async slices normally don't have sub-slices, and when they do,
      // the sub-slice is specific to the type of async slice. Thus,
      // it is not expected for sub-slices to themselves have sub-sub-slices,
      // which is why we don't recurse into the sub-slices here.
      for (var slice of this.slices) {
        yield slice;
        if (slice.subSlices) yield* slice.subSlices;
      }
    },

    childEventContainers: function* () {}
  };

  return {
    AsyncSliceGroup: AsyncSliceGroup
  };
});