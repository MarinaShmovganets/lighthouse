/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimingSummary = require('../../../computed/metrics/timing-summary.js');

const trace = require('../../fixtures/traces/lcp-all-frames-m89.json');
const devtoolsLog = require('../../fixtures/traces/lcp-all-frames-m89.devtools.log.json');

/* eslint-env jest */
describe('Timing summary', () => {
  it('contains the correct data', async () => {
    const context = {settings: {throttlingMethod: 'devtools'}, computedCache: new Map()};
    const result = await TimingSummary.request({trace, devtoolsLog}, context);

    expect(result.metrics).toMatchInlineSnapshot(`
      Object {
        "cumulativeLayoutShift": 0,
        "estimatedInputLatency": 375.30033333333495,
        "estimatedInputLatencyTs": undefined,
        "firstCPUIdle": 26580.768,
        "firstCPUIdleTs": 176404642571,
        "firstContentfulPaint": 7729.266,
        "firstContentfulPaintTs": 176385791069,
        "firstMeaningfulPaint": 7729.266,
        "firstMeaningfulPaintTs": 176385791069,
        "interactive": 33916.311,
        "interactiveTs": 176411978114,
        "largestContentfulPaint": 10790.357,
        "largestContentfulPaintAllFrames": 41281.798,
        "largestContentfulPaintAllFramesTs": 176419343601,
        "largestContentfulPaintTs": 176388852160,
        "maxPotentialFID": 755.583,
        "observedCumulativeLayoutShift": 0,
        "observedDomContentLoaded": 7502.177,
        "observedDomContentLoadedTs": 176385563980,
        "observedFirstContentfulPaint": 7729.266,
        "observedFirstContentfulPaintTs": 176385791069,
        "observedFirstMeaningfulPaint": 7729.266,
        "observedFirstMeaningfulPaintTs": 176385791069,
        "observedFirstPaint": 4369.614,
        "observedFirstPaintTs": 176382431417,
        "observedFirstVisualChange": 4347,
        "observedFirstVisualChangeTs": 176382408803,
        "observedLargestContentfulPaint": 10790.357,
        "observedLargestContentfulPaintAllFrames": 41281.798,
        "observedLargestContentfulPaintAllFramesTs": 176419343601,
        "observedLargestContentfulPaintTs": 176388852160,
        "observedLastVisualChange": 26349,
        "observedLastVisualChangeTs": 176404410803,
        "observedLoad": 25241.594,
        "observedLoadTs": 176403303397,
        "observedNavigationStart": 0,
        "observedNavigationStartTs": 176378061803,
        "observedSpeedIndex": 10039.849689989984,
        "observedSpeedIndexTs": 176388101652.69,
        "observedTimeOrigin": 0,
        "observedTimeOriginTs": 176378061803,
        "observedTraceEnd": 43238.817,
        "observedTraceEndTs": 176421300620,
        "speedIndex": 10040,
        "speedIndexTs": 176388101803,
        "totalBlockingTime": 3747.2890000000007,
      }
    `);
    // Includes performance metrics
    expect(result.metrics.firstContentfulPaint).toBeDefined();
    // Includes timestamps from trace of tab
    expect(result.metrics.observedFirstContentfulPaint).toBeDefined();
    // Includs visual metrics from Speedline
    expect(result.metrics.observedFirstVisualChange).toBeDefined();

    expect(result.debugInfo).toEqual({lcpInvalidated: false, lcpAllFramesInvalidated: false});
  });
});
