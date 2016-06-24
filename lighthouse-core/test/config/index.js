/**
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

const ConfigParser = require('../../config');
const defaultConfig = require('../../config/default.json');
const IsOnHTTPS = require('../../audits/is-on-https');
const assert = require('assert');
const path = require('path');

/* global describe, it*/

describe('ConfigParser', () => {
  it('returns default config', () => {
    const config = ConfigParser.parse(undefined);
    assert.deepEqual(config, defaultConfig);
  });

  it('gets gatherers needed by audits', () => {
    const requiredGatherers = ConfigParser.getGatherersNeededByAudits({audits: [IsOnHTTPS]});
    assert.ok(requiredGatherers.has('HTTPS'));
  });

  it('returns an empty set for required gatherers when no audits are specified', () => {
    const requiredGatherers = ConfigParser.getGatherersNeededByAudits({});
    assert.equal(requiredGatherers.size, 0);
  });

  it('throws for unknown gatherers', () => {
    const config = {
      passes: [{
        gatherers: ['fuzz']
      }],
      audits: [
        'is-on-https'
      ]
    };

    return assert.throws(_ => ConfigParser.parse(config),
        /Unable to locate/);
  });

  it('handles non-existent audits when expanding', () => {
    const modifiedResults = ConfigParser.expandAudits();

    return assert.equal(modifiedResults, undefined);
  });

  it('expands audits', () => {
    const modifiedResults = ConfigParser.expandAudits(['is-on-https']);

    assert.ok(Array.isArray(modifiedResults));
    assert.equal(modifiedResults.length, 1);
    return assert.equal(typeof modifiedResults[0], 'function');
  });

  it('handles non-existent audits when filtering', () => {
    const modifiedResults = ConfigParser.filterAudits(undefined, ['a']);

    return assert.equal(modifiedResults, undefined);
  });

  it('returns unfiltered audits when no whitelist is given', () => {
    const modifiedResults = ConfigParser.filterAudits(['is-on-https']);

    assert.ok(Array.isArray(modifiedResults));
    assert.equal(modifiedResults.length, 1);
    return assert.equal(modifiedResults[0], 'is-on-https');
  });

  it('returns filtered audits when a whitelist is given', () => {
    const modifiedResults = ConfigParser.filterAudits(['is-on-https'], new Set(['b']));

    assert.ok(Array.isArray(modifiedResults));
    return assert.equal(modifiedResults.length, 0);
  });

  it('expands audits in the config', () => {
    const config = {
      audits: ['user-timings']
    };

    ConfigParser.parse(config);
    assert.ok(Array.isArray(config.audits));
    assert.equal(config.audits.length, 1);
    return assert.equal(typeof config.audits[0], 'function');
  });

  it('expands trace contents', () => {
    const config = ConfigParser.parse({
      artifacts: {
        traceContents: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json')
      }
    });
    const traceUserTimings = require('../fixtures/traces/trace-user-timings.json');
    assert.deepEqual(config.artifacts.traceContents, traceUserTimings);
  });

  it('expands performance logs', () => {
    const config = ConfigParser.parse({
      artifacts: {
        performanceLog: path.resolve(__dirname, '../fixtures/perflog.json')
      }
    });

    assert.ok(config.artifacts.CriticalRequestChains);
  });

  it('parses performance logs', () => {
    const perflog = require('../fixtures/perflog.json');
    const crc = ConfigParser.parsePerformanceLog(perflog, {});
    assert.ok(crc['93149.1']);
    assert.ok(crc['93149.1'].request);
    assert.ok(crc['93149.1'].children);
  });
});

