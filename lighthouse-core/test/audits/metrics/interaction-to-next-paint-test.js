/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const InteractionToNextPaint = require('../../../audits/metrics/interaction-to-next-paint.js');
const interactionTrace = require('../../fixtures/traces/timespan-responsiveness.trace.json');
const noInteractionTrace = require('../../fixtures/traces/jumpy-cls-m90.json');

/* eslint-env jest */

describe('Interaction to Next Paint', () => {
  function getTestData() {
    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {
        [InteractionToNextPaint.DEFAULT_PASS]: interactionTrace,
      },
    };

    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: InteractionToNextPaint.defaultOptions,
    };

    return {artifacts, context};
  }

  it('evaluates INP correctly', async () => {
    const {artifacts, context} = getTestData();
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toEqual({
      // TODO: this is incorrect, only looking at main frame events right now.
      score: 0.85,
      numericValue: 237,
      numericUnit: 'millisecond',
      displayValue: expect.toBeDisplayString('240 ms'),
    });
  });

  it('is not applicable if not measured in a timespan', async () => {
    const {artifacts, context} = getTestData();
    artifacts.GatherContext.gatherMode = 'navigation';
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if using simulated throttling', async () => {
    const {artifacts, context} = getTestData();
    context.settings.throttlingMethod = 'simulate';
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if no interactions occurred in trace', async () => {
    const {artifacts, context} = getTestData();
    artifacts.traces[InteractionToNextPaint.DEFAULT_PASS] = noInteractionTrace;
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });
});
