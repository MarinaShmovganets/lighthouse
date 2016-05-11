/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./user_expectation.js");

'use strict';

global.tr.exportTo('tr.model.um', function() {
  var LOAD_SUBTYPE_NAMES = {
    SUCCESSFUL: 'Successful',
    FAILED: 'Failed',
    STARTUP: 'Startup'
  };

  var DOES_LOAD_SUBTYPE_NAME_EXIST = {};
  for (var key in LOAD_SUBTYPE_NAMES) {
    DOES_LOAD_SUBTYPE_NAME_EXIST[LOAD_SUBTYPE_NAMES[key]] = true;;
  }

  function LoadExpectation(parentModel, initiatorTitle, start, duration) {
    if (!DOES_LOAD_SUBTYPE_NAME_EXIST[initiatorTitle])
      throw new Error(initiatorTitle + ' is not in LOAD_SUBTYPE_NAMES');

    tr.model.um.UserExpectation.call(
        this, parentModel, initiatorTitle, start, duration);

    // |renderProcess| is the renderer process that contains the loading
    // RenderFrame.
    this.renderProcess = undefined;

    // |renderMainThread| is the CrRendererMain thread in the |renderProcess|
    // that contains the loading RenderFrame.
    this.renderMainThread = undefined;

    // |routingId| identifies the loading RenderFrame within the renderer
    // process.
    this.routingId = undefined;

    // |parentRoutingId| identifies the RenderFrame that created and contains
    // the loading RenderFrame.
    this.parentRoutingId = undefined;

    // |loadFinishedEvent|, if present, signals that this is a main frame.
    this.loadFinishedEvent = undefined;

    // Startup LoadIRs do not have renderProcess, routingId, or
    // parentRoutingId. Maybe RenderLoadIR should be a separate class?
  }

  LoadExpectation.prototype = {
    __proto__: tr.model.um.UserExpectation.prototype,
    constructor: LoadExpectation
  };

  tr.model.um.UserExpectation.register(LoadExpectation, {
    stageTitle: 'Load',
    colorId: tr.b.ColorScheme.getColorIdForReservedName('rail_load')
  });

  return {
    LOAD_SUBTYPE_NAMES: LOAD_SUBTYPE_NAMES,
    LoadExpectation: LoadExpectation
  };
});
