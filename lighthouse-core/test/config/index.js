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

const ConfigParser = require('../../config');
const defaultConfig = require('../../config/default.json');
const assert = require('assert');
const path = require('path');

/* global describe, it*/

describe('ConfigParser', () => {
  it('returns default config', () => {
    const config = ConfigParser.parse();
    assert.deepEqual(config, defaultConfig);
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
    const crc = ConfigParser.parsePerformanceLog(perflog);
    assert.ok(crc['93149.1']);
    assert.ok(crc['93149.1'].request);
    assert.ok(crc['93149.1'].children);
  });
});

