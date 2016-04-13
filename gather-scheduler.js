/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

class GatherScheduler {

  static _runPhase(gatherers, gatherFun) {
    return gatherers.reduce(
      (chain, gatherer) => chain.then(_ => gatherFun(gatherer)),
      Promise.resolve()
    );
  }

  static run(gatherers, options) {
    const driver = options.driver;
    const url = options.url;
    const loadPage = options.flags.loadPage;
    const emulateMobileDevice = options.flags.mobile;
    const saveTrace = options.flags.saveTrace;
    const tracingData = {};
    const artifacts = [];

    if (url === undefined || url === null) {
      throw new Error('You must provide a url to scheduler');
    }

    return driver.connect()

      // Enable emulation.
      .then(_ => {
        if (emulateMobileDevice) {
          return driver.beginEmulation();
        }

        return Promise.resolve();
      })

      // Clean all browser caches.
      .then(_ => driver.cleanAndDisableBrowserCaches())

      // Force SWs to update on load.
      .then(_ => driver.forceUpdateServiceWorkers())

      // Gather: setup phase.
      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.setup(options)))

      // Enable tracing and network record collection.
      .then(_ => driver.beginTrace())
      .then(_ => driver.beginNetworkCollect())

      // Gather: beforePageLoad phase.
      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.beforePageLoad(options)))

      // Load the page (if the CLI / extension want it loaded).
      .then(_ => {
        if (loadPage) {
          return driver.gotoURL(url, driver.WAIT_FOR_LOADED);
        }

        return Promise.resolve();
      })

      // Gather: afterPageLoad phase
      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.afterPageLoad(options)))

      // Disable network collection; grab records.
      .then(_ => driver.endNetworkCollect())
      .then(networkRecords => {
        tracingData.networkRecords = networkRecords;
      })

      // Disable tracing; grab records.
      .then(_ => driver.endTrace())
      .then(traceContents => {
        tracingData.traceContents = traceContents;
      })
      .then(_ => this.saveAssets(saveTrace, tracingData, url))

      // Gather: afterTraceCollected phase.
      .then(_ => this._runPhase(gatherers,
          gatherer => gatherer.afterTraceCollected(options, tracingData, url)))

      // Disconnect the driver.
      .then(_ => driver.disconnect())

      // Gather: tearDown phase.
      .then(_ => this._runPhase(gatherers,
        gatherer => gatherer.tearDown(options, tracingData)))

      // Collate all the gatherer results.
      .then(_ => {
        artifacts.push(...gatherers.map(g => g.artifact));
        artifacts.push(
          {networkRecords: tracingData.networkRecords},
          {traceContents: tracingData.traceContents}
        );
      })
      .then(_ => artifacts);
  }

  static saveAssets(saveTrace, tracingData, url) {
    /* globals window */
    function hostOfURL(url) {
      if (typeof process !== 'undefined' && 'version' in process) {
        return require('url').parse(url).hostname;
      }
      return new window.URL(window.location.href).hostname;
    }

    if (saveTrace) {
      let date = new Date();
      let file = ('lh-' + hostOfURL(url) + '_' + date.toISOString() + '.trace.json')
          .replace(/[\/\?<>\\:\*\|":]/g, '-');
      require('fs').writeFileSync(file, JSON.stringify(tracingData.traceContents, null, 2));
      console.log('Trace file: ' + file);
    }
  }
}

module.exports = GatherScheduler;
