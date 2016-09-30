"use strict";
/**
Copyright (c) 2013 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./process_base.js");
require("./process_memory_dump.js");

'use strict';

/**
 * @fileoverview Provides the Process class.
 */
global.tr.exportTo('tr.model', function() {
  var ProcessBase = tr.model.ProcessBase;
  var ProcessInstantEvent = tr.model.ProcessInstantEvent;
  var Frame = tr.model.Frame;
  var ProcessMemoryDump = tr.model.ProcessMemoryDump;

  /**
   * The Process represents a single userland process in the
   * trace.
   * @constructor
   */
  function Process(model, pid) {
    if (model === undefined)
      throw new Error('model must be provided');
    if (pid === undefined)
      throw new Error('pid must be provided');
    tr.model.ProcessBase.call(this, model);
    this.pid = pid;
    this.name = undefined;
    this.labels = [];
    this.instantEvents = [];
    this.memoryDumps = [];
    this.frames = [];
    this.activities = [];
  };

  /**
   * Comparison between processes that orders by pid.
   */
  Process.compare = function(x, y) {
    var tmp = tr.model.ProcessBase.compare(x, y);
    if (tmp)
      return tmp;

    tmp = tr.b.comparePossiblyUndefinedValues(
        x.name, y.name,
        function(x, y) { return x.localeCompare(y); });
    if (tmp)
      return tmp;

    tmp = tr.b.compareArrays(x.labels, y.labels,
        function(x, y) { return x.localeCompare(y); });
    if (tmp)
      return tmp;

    return x.pid - y.pid;
  };

  Process.prototype = {
    __proto__: tr.model.ProcessBase.prototype,

    get stableId() {
      return this.pid;
    },

    compareTo: function(that) {
      return Process.compare(this, that);
    },

    childEvents: function*() {
      yield * ProcessBase.prototype.childEvents.call(this);
      yield * this.instantEvents;
      yield * this.frames;
      yield * this.memoryDumps;
    },

    addLabelIfNeeded: function(labelName) {
      for (var i = 0; i < this.labels.length; i++) {
        if (this.labels[i] === labelName)
          return;
      }
      this.labels.push(labelName);
    },

    get userFriendlyName() {
      var res;
      if (this.name)
        res = this.name + ' (pid ' + this.pid + ')';
      else
        res = 'Process ' + this.pid;
      if (this.labels.length)
        res += ': ' + this.labels.join(', ');
      return res;
    },

    get userFriendlyDetails() {
      if (this.name)
        return this.name + ' (pid ' + this.pid + ')';
      return 'pid: ' + this.pid;
    },

    getSettingsKey: function() {
      if (!this.name)
        return undefined;
      if (!this.labels.length)
        return 'processes.' + this.name;
      return 'processes.' + this.name + '.' + this.labels.join('.');
    },

    shiftTimestampsForward: function(amount) {
      for (var i = 0; i < this.instantEvents.length; i++)
        this.instantEvents[i].start += amount;

      for (var i = 0; i < this.frames.length; i++)
        this.frames[i].shiftTimestampsForward(amount);

      for (var i = 0; i < this.memoryDumps.length; i++)
        this.memoryDumps[i].shiftTimestampsForward(amount);

      for (var i = 0; i < this.activities.length; i++)
        this.activities[i].shiftTimestampsForward(amount);

      tr.model.ProcessBase.prototype
          .shiftTimestampsForward.apply(this, arguments);
    },

    updateBounds: function() {
      tr.model.ProcessBase.prototype.updateBounds.apply(this);

      for (var i = 0; i < this.frames.length; i++)
        this.frames[i].addBoundsToRange(this.bounds);

      for (var i = 0; i < this.memoryDumps.length; i++)
        this.memoryDumps[i].addBoundsToRange(this.bounds);

      for (var i = 0; i < this.activities.length; i++)
        this.activities[i].addBoundsToRange(this.bounds);
    },

    sortMemoryDumps: function() {
      this.memoryDumps.sort(function(x, y) {
        return x.start - y.start;
      });
      tr.model.ProcessMemoryDump.hookUpMostRecentVmRegionsLinks(
          this.memoryDumps);
    }
  };

  return {
    Process: Process
  };
});
