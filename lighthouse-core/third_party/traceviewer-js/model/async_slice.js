"use strict";
/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../base/unit.js");
require("./timed_event.js");

'use strict';

/**
 * @fileoverview Provides the AsyncSlice class.
 */
global.tr.exportTo('tr.model', function() {
  /**
   * A AsyncSlice represents an interval of time during which an
   * asynchronous operation is in progress. An AsyncSlice consumes no CPU time
   * itself and so is only associated with Threads at its start and end point.
   *
   * @constructor
   */
  function AsyncSlice(category, title, colorId, start, args, duration,
                      opt_isTopLevel, opt_cpuStart, opt_cpuDuration,
                      opt_argsStripped) {
    tr.model.TimedEvent.call(this, start);

    this.category = category || '';
    // We keep the original title from the trace file in originalTitle since
    // some sub-classes, e.g. NetAsyncSlice, change the title field.
    this.originalTitle = title;
    this.title = title;
    this.colorId = colorId;
    this.args = args;
    this.startStackFrame = undefined;
    this.endStackFrame = undefined;
    this.didNotFinish = false;
    this.important = false;
    this.subSlices = [];
    this.parentContainer_ = undefined;

    this.id = undefined;
    this.startThread = undefined;
    this.endThread = undefined;
    this.cpuStart = undefined;
    this.cpuDuration = undefined;
    this.argsStripped = false;

    this.startStackFrame = undefined;
    this.endStackFrame = undefined;

    this.duration = duration;

    // isTopLevel is set at import because only NESTABLE_ASYNC events might not
    // be topLevel. All legacy async events are toplevel by definition.
    this.isTopLevel = (opt_isTopLevel === true);

    if (opt_cpuStart !== undefined)
      this.cpuStart = opt_cpuStart;

    if (opt_cpuDuration !== undefined)
      this.cpuDuration = opt_cpuDuration;

    if (opt_argsStripped !== undefined)
      this.argsStripped = opt_argsStripped;
  }

  AsyncSlice.prototype = {
    __proto__: tr.model.TimedEvent.prototype,

    get analysisTypeName() {
      return this.title;
    },

    get parentContainer() {
      return this.parentContainer_;
    },

    set parentContainer(parentContainer) {
      this.parentContainer_ = parentContainer;
      for (var i = 0; i < this.subSlices.length; i++) {
        var subSlice = this.subSlices[i];
        if (subSlice.parentContainer === undefined)
          subSlice.parentContainer = parentContainer;
      }
    },

    get viewSubGroupTitle() {
      return this.title;
    },

    get userFriendlyName() {
      return 'Async slice ' + this.title + ' at ' +
          tr.b.Unit.byName.timeStampInMs.format(this.start);
    },

    get stableId() {
      var parentAsyncSliceGroup = this.parentContainer.asyncSliceGroup;
      return parentAsyncSliceGroup.stableId + '.' +
          parentAsyncSliceGroup.slices.indexOf(this);
    },

    findTopmostSlicesRelativeToThisSlice: function*(eventPredicate, opt_this) {
      if (eventPredicate(this)) {
        yield this;
        return;
      }
      for (var s of this.subSlices)
        yield * s.findTopmostSlicesRelativeToThisSlice(eventPredicate);
    },

    findDescendentSlice: function(targetTitle) {
      if (!this.subSlices)
        return undefined;

      for (var i = 0; i < this.subSlices.length; i++) {
        if (this.subSlices[i].title == targetTitle)
          return this.subSlices[i];
        var slice = this.subSlices[i].findDescendentSlice(targetTitle);
        if (slice) return slice;
      }
      return undefined;
    },

    enumerateAllDescendents: function*() {
      for (var slice of this.subSlices)
        yield slice;
      for (var slice of this.subSlices)
        yield * slice.enumerateAllDescendents();
    },

    compareTo: function(that) {
      return this.title.localeCompare(that.title);
    }
  };

  tr.model.EventRegistry.register(
      AsyncSlice,
      {
        name: 'asyncSlice',
        pluralName: 'asyncSlices'
      });


  return {
    AsyncSlice: AsyncSlice
  };
});
