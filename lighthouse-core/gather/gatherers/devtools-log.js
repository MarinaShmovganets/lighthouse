/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * This gatherer collects all network and page devtools protocol traffic during the timespan/navigation.
 * This protocol log can be used to recreate the network records using lib/network-recorder.js.
 */

const NetworkMonitor = require('../driver/network-monitor.js');
const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');

class DevtoolsLog extends FRGatherer {
  static symbol = Symbol('DevtoolsLog');

  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    symbol: DevtoolsLog.symbol,
    supportedModes: ['timespan', 'navigation'],
  };

  constructor() {
    super();

    /** @type {NetworkMonitor|undefined} */
    this._networkMonitor = undefined;

    /** @type {LH.DevtoolsLog} */
    this._devtoolsLog = [];
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   */
  async startSensitiveInstrumentation({driver}) {
    this._networkMonitor = new NetworkMonitor(driver.defaultSession);
    this._networkMonitor.enable();
  }

  async stopSensitiveInstrumentation() {
    if (!this._networkMonitor) return;
    this._devtoolsLog = this._networkMonitor.getMessageLog();
    this._networkMonitor.disable();
  }

  /**
   * @return {Promise<LH.Artifacts['DevtoolsLog']>}
   */
  async getArtifact() {
    return this._devtoolsLog;
  }
}

module.exports = DevtoolsLog;
