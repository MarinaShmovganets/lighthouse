/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');

const LargestContentfulPaint = require('../../../computed/metrics/largest-contentful-paint.js'); // eslint-disable-line max-len
const trace = require('../../fixtures/traces/lcp-m79.json');
const devtoolsLog = require('../../fixtures/traces/lcp-m79.devtools.log.json');

/* eslint-env jest */

describe('Metrics: FCP', () => {
  it('should error when computing a simulated value', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const context = {settings, computedCache: new Map()};
    const resultPromise = LargestContentfulPaint.request({trace, devtoolsLog, settings}, context);
    await expect(resultPromise).rejects.toThrow();
  });

  it('should compute an observed value', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const result = await LargestContentfulPaint.request({trace, devtoolsLog, settings}, context);

    assert.equal(Math.round(result.timing), 15024);
    assert.equal(result.timestamp, 1671236939268);
  });
});
