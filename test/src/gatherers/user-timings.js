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

/* eslint-env mocha */

const GathererClass = require('../../../src/gatherers/user-timings');
const assert = require('assert');
const traceContents = require('./trace-user-timings.json');
let gatherer;

describe('UserTimings gatherer', () => {
  beforeEach(() => {
    gatherer = new GathererClass();
  });

  it('returns an artifact', () => {
    gatherer.postProfiling({}, {
      traceContents: traceContents
    });

    assert.ok(Array.isArray(gatherer.artifact));
    assert.equal(gatherer.artifact.length, 2);
    assert.equal(gatherer.artifact[0].name, 'mark_test');
    assert.equal(gatherer.artifact[1].name, 'measure_test');
  });

  it('handles tracing failures', () => {
    gatherer.postProfiling();
    assert.ok(Array.isArray(gatherer.artifact));
    assert.equal(gatherer.artifact.length, 0);
  });
});
