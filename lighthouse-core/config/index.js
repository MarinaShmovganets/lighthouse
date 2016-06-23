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

const defaultConfig = require('./default.json');
const recordsFromLogs = require('../lib/network-recorder').recordsFromLogs;
const CriticalRequestChainsGatherer = require('../driver/gatherers/critical-request-chains');

class ConfigParser {
  static parsePerformanceLog(logs) {
    // Parse logs for network events
    const networkRecords = recordsFromLogs(logs);

    // User critical request chains gatherer to create the critical request chains artifact
    const criticalRequestChainsGatherer = new CriticalRequestChainsGatherer();
    criticalRequestChainsGatherer.afterPass({}, {networkRecords});

    return criticalRequestChainsGatherer.artifact;
  }

  static parse(config) {
    if (!config) {
      return defaultConfig;
    }
    if (config.artifacts) {
      // currently only trace logs and performance logs should be imported
      if (config.artifacts.traceContents) {
        config.artifacts.traceContents = require(config.artifacts.traceContents);
      }
      if (config.artifacts.performanceLog) {
        config.artifacts.CriticalRequestChains =
          ConfigParser.parsePerformanceLog(require(config.artifacts.performanceLog));
      }
    }

    return config;
  }
}

module.exports = ConfigParser;
