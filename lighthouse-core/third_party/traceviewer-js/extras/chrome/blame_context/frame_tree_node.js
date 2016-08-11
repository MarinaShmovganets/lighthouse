/**
Copyright (c) 2016 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./blame_context.js");

'use strict';

/**
 * @fileoverview Trace Viewer side's correspondence of Chrome's
 * content::FrameTreeNode class.
 *
 */
global.tr.exportTo('tr.e.chrome', function() {
  var BlameContextSnapshot = tr.e.chrome.BlameContextSnapshot;
  var BlameContextInstance = tr.e.chrome.BlameContextInstance;

  function FrameTreeNodeSnapshot() {
    BlameContextSnapshot.apply(this, arguments);
  }

  FrameTreeNodeSnapshot.prototype = {
    __proto__: BlameContextSnapshot.prototype,

    get renderFrame() {
      if (this.args.renderFrame instanceof tr.e.chrome.RenderFrameSnapshot)
        return this.args.renderFrame;
      return undefined;
    },

    get url() {
      return this.args.url;
    },

    get userFriendlyName() {
      return 'FrameTreeNode';
    }
  };

  tr.model.ObjectSnapshot.register(
      FrameTreeNodeSnapshot,
      {typeName: 'FrameTreeNode'});

  function FrameTreeNodeInstance() {
    BlameContextInstance.apply(this, arguments);
  }

  FrameTreeNodeInstance.prototype = {
    __proto__: BlameContextInstance.prototype,

    get blameContextType() {
      return 'Frame';
    }
  };

  tr.model.ObjectInstance.register(
      FrameTreeNodeInstance,
      {typeName: 'FrameTreeNode'});

  return {
    FrameTreeNodeSnapshot: FrameTreeNodeSnapshot,
    FrameTreeNodeInstance: FrameTreeNodeInstance
  };
});
