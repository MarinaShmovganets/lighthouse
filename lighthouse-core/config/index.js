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
const Driver = require('../driver');
const log = require('../lib/log');

class ConfigParser {
  static filterAudits(audits, whitelist) {
    // It's possible we didn't get given any audits (but existing audit results), in which case
    // there is no need to do any filter work.
    if (!audits) {
      return;
    }

    const rejected = [];
    const filteredAudits = audits.filter(a => {
      // If there is no whitelist, assume all.
      if (!whitelist) {
        return true;
      }

      const auditName = a.toLowerCase();
      const inWhitelist = whitelist.has(auditName);

      if (!inWhitelist) {
        rejected.push(auditName);
      }

      return inWhitelist;
    });

    if (rejected.length) {
      log.log('info', 'Running these audits:', `${filteredAudits.join(', ')}`);
      log.log('info', 'Skipping these audits:', `${rejected.join(', ')}`);
    }

    return filteredAudits;
  }

  static expandAudits(audits) {
    // It's possible we didn't get given any audits (but existing audit results), in which case
    // there is no need to do any expansion work.
    if (!audits) {
      return;
    }

    return audits.map(audit => {
      // If this is already instantiated, don't do anything else.
      if (typeof audit !== 'string') {
        return audit;
      }

      try {
        return require(`../audits/${audit}`);
      } catch (requireError) {
        throw new Error(`Unable to locate audit: ${audit}`);
      }
    });
  }

  static getGatherersNeededByAudits(config) {
    // It's possible we didn't get given any audits (but existing audit results), in which case
    // there is no need to do any work here.
    if (!config.audits) {
      return new Set();
    }

    return config.audits.reduce((list, audit) => {
      audit.meta.requiredArtifacts.forEach(artifact => list.add(artifact));
      return list;
    }, new Set());
  }

  static filterPasses(config) {
    const requiredGatherers = ConfigParser.getGatherersNeededByAudits(config);

    // Make sure we only have the gatherers that are needed by the audits
    // that have been listed in the config.
    const filteredPasses = config.passes.map(pass => {
      pass.gatherers = pass.gatherers.filter(gatherer => {
        if (typeof gatherer !== 'string') {
          return requiredGatherers.has(gatherer.name);
        }

        try {
          const GathererClass = Driver.getGathererClass(gatherer);
          return requiredGatherers.has(GathererClass.name);
        } catch (requireError) {
          throw new Error(`Unable to locate gatherer: ${gatherer}`);
        }
      });

      return pass;
    })

    // Now remove any passes which no longer have gatherers.
    .filter(p => p.gatherers.length > 0);
    return filteredPasses;
  }

  static parsePerformanceLog(logs) {
    // Parse logs for network events
    const networkRecords = recordsFromLogs(logs);

    // Use critical request chains gatherer to create the critical request chains artifact
    const criticalRequestChainsGatherer = new CriticalRequestChainsGatherer();
    criticalRequestChainsGatherer.afterPass({}, {networkRecords});

    return criticalRequestChainsGatherer.artifact;
  }

  static parse(config, auditWhitelist) {
    if (!config) {
      config = defaultConfig;
    }

    // Filter out audits by the whitelist
    if (config.audits) {
      config.audits = ConfigParser.expandAudits(
          ConfigParser.filterAudits(config.audits, auditWhitelist)
        );
    }

    if (config.passes) {
      config.passes = ConfigParser.filterPasses(config);
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
