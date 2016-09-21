/**
Copyright (c) 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../event_container.js");

'use strict';

global.tr.exportTo('tr.model.um', function() {
  function UserModel(parentModel) {
    tr.model.EventContainer.call(this);
    this.parentModel_ = parentModel;
    this.expectations_ = new tr.model.EventSet();
  }

  UserModel.prototype = {
    __proto__: tr.model.EventContainer.prototype,

    get stableId() {
      return 'UserModel';
    },

    get parentModel() {
      return this.parentModel_;
    },

    sortExpectations: function() {
      this.expectations_.sortEvents((x, y) => (x.start - y.start));
    },

    get expectations() {
      return this.expectations_;
    },

    shiftTimestampsForward: function(amount) {
    },

    addCategoriesToDict: function(categoriesDict) {
    },

    childEvents: function*() {
      yield * this.expectations;
    },

    childEventContainers: function*() {
    },

    updateBounds: function() {
      this.bounds.reset();
      this.expectations.forEach(function(expectation) {
        expectation.addBoundsToRange(this.bounds);
      }, this);
    }
  };

  return {
    UserModel: UserModel
  };
});
