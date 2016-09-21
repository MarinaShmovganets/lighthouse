/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./user_expectation.js");

'use strict';

global.tr.exportTo('tr.model.um', function() {
  function IdleExpectation(parentModel, start, duration) {
    var initiatorTitle = '';
    tr.model.um.UserExpectation.call(
        this, parentModel, initiatorTitle, start, duration);
  }

  IdleExpectation.prototype = {
    __proto__: tr.model.um.UserExpectation.prototype,
    constructor: IdleExpectation
  };

  tr.model.um.UserExpectation.subTypes.register(IdleExpectation, {
    stageTitle: 'Idle',
    colorId: tr.b.ColorScheme.getColorIdForReservedName('rail_idle')
  });

  return {
    IdleExpectation: IdleExpectation
  };
});
