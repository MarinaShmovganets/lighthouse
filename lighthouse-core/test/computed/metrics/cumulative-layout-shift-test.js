/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CumulativeLayoutShift = require('../../../computed/metrics/cumulative-layout-shift.js'); // eslint-disable-line max-len
const trace = require('../../results/artifacts/defaultPass.trace.json');
const invalidTrace = require('../../fixtures/traces/progressive-app-m60.json');

/* eslint-env jest */

describe('Metrics: CLS', () => {
  it('should compute value', async () => {
    const context = {computedCache: new Map()};
    const result = await CumulativeLayoutShift.request(trace, context);
    expect(result.value).toBe(0.42);
    expect(result.debugInfo.finalLayoutShiftTraceEventFound).toBe(true);
  });

  it('should fail to compute a value for old trace', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await CumulativeLayoutShift.request(invalidTrace, context);
    expect(result.value).toBe(0);
    expect(result.debugInfo.finalLayoutShiftTraceEventFound).toBe(false);
  });
});
