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

const fs = require('fs');
const log = require('./lib/log.js');
const screenshotDump = require('./lib/screenshot-page.js')

function loadPage(driver, gatherers, options) {
  const loadPage = options.flags.loadPage;
  const url = options.url;

  if (loadPage) {
    return driver.gotoURL(url, {waitForLoad: true});
  }

  return Promise.resolve();
}

function reloadPage(driver, options) {
  // Since a Page.reload command does not let a service worker take over, we
  // navigate away and then come back to reload. We do not `waitForLoad` on
  // about:blank since a page load event is never fired on it.
  return driver.gotoURL('about:blank')
    .then(_ => driver.gotoURL(options.url, {waitForLoad: true}));
}

function setupDriver(driver, gatherers, options) {
  return new Promise((resolve, reject) => {
    // Enable emulation.
    if (options.flags.mobile) {
      return resolve(driver.beginEmulation());
    }

    // noop if no mobile emulation
    resolve();
  }).then(_ => {
    return driver.cleanAndDisableBrowserCaches();
  }).then(_ => {
    // Force SWs to update on load.
    return driver.forceUpdateServiceWorkers();
  });
}

// Enable tracing and network record collection.
function beginPassiveCollection(driver) {
  return driver.beginTrace()
    .then(_ => driver.beginNetworkCollect())
    .then(_ => driver.beginFrameLoadCollect());
}

function endPassiveCollection(options, tracingData) {
  const driver = options.driver;
  return driver.endNetworkCollect().then(networkData => {
    tracingData.networkRecords = networkData.networkRecords;
    tracingData.rawNetworkEvents = networkData.rawNetworkEvents;
  }).then(_ => {
    return driver.endTrace();
  }).then(traceContents => {
    tracingData.traceContents = traceContents;
    return driver.endFrameLoadCollect();
  }).then(frameLoadEvents => {
    tracingData.frameLoadEvents = frameLoadEvents;
  });
}

function phaseRunner(gatherers) {
  return function runPhase(gatherFun) {
    return gatherers.reduce((chain, gatherer) => {
      return chain.then(_ => gatherFun(gatherer));
    }, Promise.resolve());
  };
}

function flattenArtifacts(artifacts) {
  return artifacts.reduce(function(prev, curr) {
    return Object.assign(prev, curr);
  }, {});
}

function saveArtifacts(artifacts) {
  const artifactsFilename = 'artifacts.log';
  // The _target property of NetworkRequest is circular.
  // We skip it when stringifying.
  const replacer = (key, value) => key === '_target' ? undefined : value;
  fs.writeFileSync(artifactsFilename, JSON.stringify(artifacts, replacer));
  log.log('info', 'artifacts file saved to disk', artifactsFilename);
}

function getAssetFilename(assetName, url) {
  const date = new Date();
  const hostname = url.match(/^.*?\/\/(.*?)(:?\/|$)/)[1];
  const filenamePrefix = hostname + '_' + date.toISOString();
  return (filenamePrefix + assetName).replace(/[\/\?<>\\:\*\|":]/g, '-')
}

function saveAssets(options, artifacts) {
  const url = options.url;
  const traceFilename = getAssetFilename('.trace.json', url);

  fs.writeFileSync(traceFilename, JSON.stringify(artifacts.traceContents, null, 2));
  log.log('info', 'trace file saved to disk', traceFilename);

  const screenshotsFilename = getAssetFilename('.screenshots.html', url);
  const html = screenshotDump(screenshotsFilename, artifacts.screenshots);
  fs.writeFileSync(screenshotsFilename, html);
  log.log('info', 'screenshots saved to disk', screenshotsFilename);
}

function run(gatherers, options) {
  const driver = options.driver;
  const tracingData = {};

  if (typeof options.url !== 'string' || options.url.length === 0) {
    return Promise.reject(new Error('You must provide a url to scheduler'));
  }

  const runPhase = phaseRunner(gatherers);

  return driver.connect()
    // Initial prep before the page load.
    .then(_ => setupDriver(driver, gatherers, options))
    .then(_ => runPhase(gatherer => gatherer.setup(options)))
    .then(_ => beginPassiveCollection(driver))
    .then(_ => runPhase(gatherer => gatherer.beforePageLoad(options)))

    // Load page, gather from browser, stop profilers.
    .then(_ => loadPage(driver, gatherers, options))
    .then(_ => runPhase(gatherer => gatherer.profiledPostPageLoad(options)))
    .then(_ => endPassiveCollection(options, tracingData))
    .then(_ => runPhase(gatherer => gatherer.postProfiling(options, tracingData)))

    // Reload page for SW, etc.
    .then(_ => runPhase(gatherer => gatherer.reloadSetup(options)))
    .then(_ => runPhase(gatherer => gatherer.beforeReloadPageLoad(options)))
    .then(_ => reloadPage(driver, options))
    .then(_ => runPhase(gatherer => gatherer.afterReloadPageLoad(options)))

    // Reload page again for HTTPS redirect
    .then(_ => {
      options.url = options.url.replace(/^https/, 'http');
    })
    .then(_ => reloadPage(driver, options))
    .then(_ => runPhase(gatherer => gatherer.afterSecondReloadPageLoad(options)))

    // Finish and teardown.
    .then(_ => driver.disconnect())
    .then(_ => runPhase(gatherer => gatherer.tearDown(options)))
    .then(_ => {
      // Collate all the gatherer results.
      const unflattenedArtifacts = gatherers.map(g => g.artifact).concat(
          {networkRecords: tracingData.networkRecords},
          {rawNetworkEvents: tracingData.rawNetworkEvents},
          {traceContents: tracingData.traceContents},
          {frameLoadEvents: tracingData.frameLoadEvents});

      const artifacts = flattenArtifacts(unflattenedArtifacts);

      if (options.flags.saveArtifacts) {
        saveArtifacts(artifacts);
      }
      if (options.flags.saveAssets) {
        saveAssets(options, artifacts);
      }

      return artifacts;
    });
}

module.exports = {
  loadPage,
  reloadPage,
  setupDriver,
  beginPassiveCollection,
  endPassiveCollection,
  phaseRunner,
  run
};
