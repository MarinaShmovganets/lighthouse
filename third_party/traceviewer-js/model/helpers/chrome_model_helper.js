/**
Copyright (c) 2014 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("../../base/guid.js");
require("../../base/iteration_helpers.js");
require("./chrome_browser_helper.js");
require("./chrome_gpu_helper.js");
require("./chrome_renderer_helper.js");

'use strict';

/**
 * @fileoverview Utilities for accessing trace data about the Chrome browser.
 */
global.tr.exportTo('tr.model.helpers', function() {
  function findChromeBrowserProcesses(model) {
    return model.getAllProcesses(
        tr.model.helpers.ChromeBrowserHelper.isBrowserProcess);
  }

  function findChromeRenderProcesses(model) {
    return model.getAllProcesses(
        tr.model.helpers.ChromeRendererHelper.isRenderProcess);
  }

  function findChromeGpuProcess(model) {
    var gpuProcesses = model.getAllProcesses(
        tr.model.helpers.ChromeGpuHelper.isGpuProcess);
    if (gpuProcesses.length !== 1)
      return undefined;
    return gpuProcesses[0];
  }

  /**
   * @constructor
   */
  function ChromeModelHelper(model) {
    this.model_ = model;

    // Find browserHelpers.
    var browserProcesses = findChromeBrowserProcesses(model);
    this.browserHelpers_ = browserProcesses.map(
        p => new tr.model.helpers.ChromeBrowserHelper(this, p));

    // Find gpuHelper.
    var gpuProcess = findChromeGpuProcess(model);
    if (gpuProcess) {
      this.gpuHelper_ = new tr.model.helpers.ChromeGpuHelper(
          this, gpuProcess);
    } else {
      this.gpuHelper_ = undefined;
    }

    // Find rendererHelpers.
    var rendererProcesses_ = findChromeRenderProcesses(model);

    this.rendererHelpers_ = {};
    rendererProcesses_.forEach(function(renderProcess) {
      var rendererHelper = new tr.model.helpers.ChromeRendererHelper(
          this, renderProcess);
      this.rendererHelpers_[rendererHelper.pid] = rendererHelper;
    }, this);
  }

  ChromeModelHelper.guid = tr.b.GUID.allocateSimple();

  ChromeModelHelper.supportsModel = function(model) {
    if (findChromeBrowserProcesses(model).length)
      return true;
    if (findChromeRenderProcesses(model).length)
      return true;
    return false;
  };

  ChromeModelHelper.prototype = {
    get pid() {
      throw new Error('woah');
    },

    get process() {
      throw new Error('woah');
    },

    get model() {
      return this.model_;
    },

    // TODO: Make all users of ChromeModelHelper support multiple browsers and
    // remove this getter (see #2119).
    get browserProcess() {
      if (this.browserHelper === undefined)
        return undefined;
      return this.browserHelper.process;
    },

    // TODO: Make all users of ChromeModelHelper support multiple browsers and
    // remove this getter (see #2119).
    get browserHelper() {
      return this.browserHelpers_[0];
    },

    get browserHelpers() {
      return this.browserHelpers_;
    },

    get gpuHelper() {
      return this.gpuHelper_;
    },

    get rendererHelpers() {
      return this.rendererHelpers_;
    }
  };

  return {
    ChromeModelHelper: ChromeModelHelper
  };
});
