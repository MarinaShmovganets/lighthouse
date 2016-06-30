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

function filterPasses(passes, audits) {
  const requiredGatherers = getGatherersNeededByAudits(audits);

  // Make sure we only have the gatherers that are needed by the audits
  // that have been listed in the config.
  const filteredPasses = passes.map(pass => {
    pass.gatherers = pass.gatherers.filter(gatherer => {
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

function getGatherersNeededByAudits(audits) {
  // It's possible we didn't get given any audits (but existing audit results), in which case
  // there is no need to do any work here.
  if (!audits) {
    return new Set();
  }

  return audits.reduce((list, audit) => {
    audit.meta.requiredArtifacts.forEach(artifact => list.add(artifact));
    return list;
  }, new Set());
}

function filterAudits(audits, whitelist) {
  // If there is no whitelist, assume all.
  if (!whitelist) {
    return Array.from(audits);
  }

  const rejected = [];
  const filteredAudits = audits.filter(a => {
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

function expandAudits(audits) {
  return audits.map(audit => {
    try {
      return require(`../audits/${audit}`);
    } catch (requireError) {
      throw new Error(`Unable to locate audit: ${audit}`);
    }
  });
}

function expandArtifacts(artifacts) {
  const expandedArtifacts = Object.assign({}, artifacts);

  // currently only trace logs and performance logs should be imported
  if (expandedArtifacts.traceContents) {
    expandedArtifacts.traceContents = require(artifacts.traceContents);
  }
  if (expandedArtifacts.performanceLog) {
    expandedArtifacts.CriticalRequestChains =
      parsePerformanceLog(require(artifacts.performanceLog));
  }

  return expandedArtifacts;
}

function parsePerformanceLog(logs) {
  // Parse logs for network events
  const networkRecords = recordsFromLogs(logs);

  // Use critical request chains gatherer to create the critical request chains artifact
  const criticalRequestChainsGatherer = new CriticalRequestChainsGatherer();
  criticalRequestChainsGatherer.afterPass({}, {networkRecords});

  return criticalRequestChainsGatherer.artifact;
}

/**
 * @return {!Config}
 */
class Config {
  constructor(config, whitelist) {
    if (!config) {
      config = defaultConfig;
    }

    // Make sure everything is a new object and not a reference
    this._audits = config.audits ? expandAudits(filterAudits(config.audits, whitelist)) : null;
    // filterPasses expects audits to have been expanded
    this._passes = config.passes ? filterPasses(config.passes, this._audits) : null;
    this._auditResults = config.auditResults ? Array.from(config.auditResults) : null;
    this._artifacts = config.artifacts ? expandArtifacts(config.artifacts) : null;
    this._aggregations = config.aggregations ? Array.from(config.aggregations) : null;
  }

  get passes() {
    return this._passes;
  }

  get audits() {
    return this._audits;
  }

  get auditResults() {
    return this._auditResults;
  }

  get artifacts() {
    return this._artifacts;
  }

  get aggregations() {
    return this._aggregations;
  }
}

module.exports = Config;
