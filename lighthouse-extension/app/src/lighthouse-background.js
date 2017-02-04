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

const ExtensionProtocol = require('../../../lighthouse-core/gather/connections/extension');
const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default.json');
const log = require('../../../lighthouse-core/lib/log');

const ReportGenerator = require('../../../lighthouse-core/report/report-generator');

const STORAGE_KEY = 'lighthouse_audits';
const SETTINGS_KEY = 'lighthouse_settings';

let installedExtensions = [];
let disableExtensionsDuringRun = false;
let lighthouseIsRunning = false;
let latestStatusLog = [];

const _flatten = arr => [].concat(...arr);

/**
 * Enables or disables all other installed chrome extensions. The initial list
 * of the user's extension is created when the background page is started.
 * @param {!boolean} enable If true, enables all other installed extensions.
 *     False disables them.
 * @param {!Promise}
 */
function enableOtherChromeExtensions(enable) {
  if (!disableExtensionsDuringRun) {
    return Promise.resolve();
  }

  const str = enable ? 'enabling' : 'disabling';
  log.log('Chrome', `${str} ${installedExtensions.length} extensions.`);

  return Promise.all(installedExtensions.map(info => {
    return new Promise((resolve, reject) => {
      chrome.management.setEnabled(info.id, enable, _ => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }));
}

/**
 * Filter out any unrequested aggregations from the config. If any audits are
 * no longer needed by any remaining aggregations, filter out those as well.
 * @param {!Object} config Lighthouse config object.
 * @param {!Object<boolean>} requestedAggregations
 */
function filterConfig(config, requestedAggregations) {
  config.aggregations = config.aggregations.filter(aggregation => {
    // First filter out single `item` aggregations, which use top level name.
    if (aggregation.items.length === 1) {
      return requestedAggregations[aggregation.name];
    }

    // Next, filter the `items` array of aggregations with multiple sub-aggregations.
    aggregation.items = aggregation.items.filter(item => {
      return requestedAggregations[item.name];
    });

    // Finally, filter out any aggregations with no sub-aggregations remaining.
    return aggregation.items.length > 0;
  });

  // Find audits required for remaining aggregations.
  const requestedItems = _flatten(config.aggregations.map(aggregation => aggregation.items));
  const auditsArray = _flatten(requestedItems.map(item => Object.keys(item.audits)));
  const requestedAuditNames = new Set(auditsArray);

  // The `audits` property in the config is a list of paths of audits to run.
  // `requestedAuditNames` is a list of audit *names*. Map paths to names, then
  // filter out any paths of audits with names that weren't requested.
  const auditPathToName = new Map(Config.requireAudits(config.audits)
    .map((AuditClass, index) => {
      const auditPath = config.audits[index];
      const auditName = AuditClass.meta.name;
      return [auditPath, auditName];
    }));
  config.audits = config.audits.filter(auditPath => {
    const auditName = auditPathToName.get(auditPath);
    return requestedAuditNames.has(auditName);
  });
}

/**
 * Sets the extension badge text.
 * @param {string=} optUrl If present, sets the badge text to "Testing <url>".
 *     Otherwise, restore the default badge text.
 */
function updateBadgeUI(optUrl) {
  if (window.chrome && chrome.runtime) {
    const manifest = chrome.runtime.getManifest();

    let title = manifest.browser_action.default_title;
    let path = manifest.browser_action.default_icon['38'];

    if (lighthouseIsRunning) {
      title = `Testing ${optUrl}`;
      path = 'images/lh_logo_icon_light.png';
    }

    chrome.browserAction.setTitle({title});
    chrome.browserAction.setIcon({path});
  }
}

/**
 * Removes artifacts from the result object for portability
 * @param {!Object} result Lighthouse results object
 */
function filterOutArtifacts(result) {
  // strip them out, as the networkRecords artifact has circular structures
  result.artifacts = undefined;
}

/**
 * @param {!Connection} connection
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseForConnection = function(connection, url, options, requestedAggregations) {
  // Always start with a freshly parsed default config.
  const runConfig = JSON.parse(JSON.stringify(defaultConfig));

  filterConfig(runConfig, requestedAggregations);
  const config = new Config(runConfig);

  // Add url and config to fresh options object.
  const runOptions = Object.assign({}, options, {url, config});

  lighthouseIsRunning = true;
  updateBadgeUI(url);

  return Runner.run(connection, runOptions) // Run Lighthouse.
    .then(result => {
      lighthouseIsRunning = false;
      updateBadgeUI();
      filterOutArtifacts(result);
      return result;
    })
    .catch(err => {
      lighthouseIsRunning = false;
      updateBadgeUI();
      throw err;
    });
};

/**
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseInExtension = function(options, requestedAggregations) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new ExtensionProtocol();
  return enableOtherChromeExtensions(false)
    .then(_ => connection.getCurrentTabURL())
    .then(url => window.runLighthouseForConnection(connection, url, options, requestedAggregations))
    .then(results => {
      return enableOtherChromeExtensions(true).then(_ => {
        const blobURL = window.createReportPageAsBlob(results, 'extension');
        chrome.tabs.create({url: blobURL});
      });
    }).catch(err => {
      return enableOtherChromeExtensions(true).then(_ => {
        throw err;
      });
    });
};

/**
 * @param {!RawProtocol.Port} port
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Object<boolean>} requestedAggregations Names of aggregations to include.
 * @return {!Promise}
 */
window.runLighthouseInWorker = function(port, url, options, requestedAggregations) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new RawProtocol(port);
  return window.runLighthouseForConnection(connection, url, options, requestedAggregations);
};

/**
 * @param {!Object} results Lighthouse results object
 * @param {!string} reportContext Where the report is going
 * @return {!string} Blob URL of the report (or error page) HTML
 */
window.createReportPageAsBlob = function(results, reportContext) {
  performance.mark('report-start');

  const reportGenerator = new ReportGenerator();
  let html;
  try {
    html = reportGenerator.generateHTML(results, reportContext);
  } catch (err) {
    html = reportGenerator.renderException(err, results);
  }
  const blob = new Blob([html], {type: 'text/html'});
  const blobURL = window.URL.createObjectURL(blob);

  performance.mark('report-end');
  performance.measure('generate report', 'report-start', 'report-end');
  return blobURL;
};

/**
 * Returns list of aggregation categories (each with a list of its constituent
 * audits) from the default config.
 * @return {!Array<{name: string, audits: !Array<string>}>}
 */
window.getDefaultAggregations = function() {
  return _flatten(
    defaultConfig.aggregations.map(aggregation => {
      if (aggregation.items.length === 1) {
        return {
          name: aggregation.name,
          audits: aggregation.items[0].audits,
        };
      }

      return aggregation.items;
    })
  ).map(aggregation => {
    return {
      name: aggregation.name,
      audits: Object.keys(aggregation.audits)
    };
  });
};

/**
 * Save currently selected set of aggregation categories to local storage.
 * @param {{selectedAggregations: !Array<string>, disableExtensions: boolean}} settings
 */
window.saveSettings = function(settings) {
  const storage = {
    [STORAGE_KEY]: {},
    [SETTINGS_KEY]: {}
  };

  // Stash selected aggregations.
  window.getDefaultAggregations().forEach(audit => {
    storage[STORAGE_KEY][audit.name] = settings.selectedAggregations.includes(audit.name);
  });

  // Stash disable extensionS setting.
  disableExtensionsDuringRun = settings.disableExtensions;
  storage[SETTINGS_KEY].disableExtensions = disableExtensionsDuringRun;

  // Save object to chrome local storage.
  chrome.storage.local.set(storage);
};

/**
 * Load selected aggregation categories from local storage.
 * @return {!Promise<{selectedAggregations: !Object<boolean>, disableExtensions: boolean}>}
 */
window.loadSettings = function() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], result => {
      // Start with list of all default aggregations set to true so list is
      // always up to date.
      const defaultAggregations = {};
      window.getDefaultAggregations().forEach(aggregation => {
        defaultAggregations[aggregation.name] = true;
      });

      // Load saved aggregations and settings, overwriting defaults with any
      // saved selections.
      const savedAggregations = Object.assign(defaultAggregations, result[STORAGE_KEY]);

      const defaultSettings = {
        disableExtensions: disableExtensionsDuringRun
      };
      const savedSettings = Object.assign(defaultSettings, result[SETTINGS_KEY]);

      resolve({
        selectedAggregations: savedAggregations,
        disableExtensions: savedSettings.disableExtensions
      });
    });
  });
};

window.listenForStatus = function(callback) {
  log.events.addListener('status', function(log) {
    latestStatusLog = log;
    callback(log);
  });

  // Show latest saved status log to give immediate feedback
  // when reopening the popup message when lighthouse is running
  if (lighthouseIsRunning && latestStatusLog) {
    callback(latestStatusLog);
  }
};

window.isRunning = function() {
  return lighthouseIsRunning;
};

// Run when in extension context, but not in devtools.
if (window.chrome && chrome.runtime) {
  // Get list of installed extensions that are enabled and can be disabled.
  // Extensions are not allowed to be disabled if they are under an admin policy.
  chrome.management.getAll(installs => {
    chrome.management.getSelf(lighthouseCrxInfo => {
      installedExtensions = installs.filter(info => {
        return info.id !== lighthouseCrxInfo.id && info.type === 'extension' &&
               info.enabled && info.mayDisable;
      });
    });
  });

  chrome.runtime.onInstalled.addListener(details => {
    if (details.previousVersion) {
      // eslint-disable-next-line no-console
      console.log('previousVersion', details.previousVersion);
    }
  });
}
