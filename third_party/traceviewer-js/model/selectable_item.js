/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./selection_state.js");

'use strict';

/**
 * @fileoverview Provides the SelectableItem class.
 */
global.tr.exportTo('tr.model', function() {
  var SelectionState = tr.model.SelectionState;

  /**
   * A SelectableItem is the abstract base class for any non-container data that
   * has an associated model item in the trace model (possibly itself).
   *
   * Subclasses must provide a selectionState property (or getter).
   *
   * @constructor
   */
  function SelectableItem(modelItem) {
    this.modelItem_ = modelItem;
  }

  SelectableItem.prototype = {
    get modelItem() {
      return this.modelItem_;
    },

    get selected() {
      return this.selectionState === SelectionState.SELECTED;
    },

    addToSelection: function(selection) {
      var modelItem = this.modelItem_;
      if (!modelItem)
        return;
      selection.push(modelItem);
    },

    addToTrackMap: function(eventToTrackMap, track) {
      var modelItem = this.modelItem_;
      if (!modelItem)
        return;
      eventToTrackMap.addEvent(modelItem, track);
    }
  };

  return {
    SelectableItem: SelectableItem
  };
});
