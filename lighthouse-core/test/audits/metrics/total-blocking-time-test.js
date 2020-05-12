/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TBTAudit = require('../../../audits/metrics/total-blocking-time.js');
const defaultOptions = TBTAudit.defaultOptions;

const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

function generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice}) {
  return {
    traces: {[TBTAudit.DEFAULT_PASS]: trace},
    devtoolsLogs: {[TBTAudit.DEFAULT_PASS]: devtoolsLog},
    TestedAsMobileDevice,
  };
}

function generateContext({throttlingMethod}) {
  const settings = {throttlingMethod};
  return {options: defaultOptions, settings, computedCache: new Map()};
}
/* eslint-env jest */

describe('Performance: total-blocking-time audit', () => {
  it('evaluates Total Blocking Time metric properly', async () => {
    const artifacts = generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice: true});
    const context = generateContext({throttlingMethod: 'provided'});

    const output = await TBTAudit.audit(artifacts, context);
    expect(output.numericValue).toBeCloseTo(48.3, 1);
    expect(output.score).toBe(1);
    expect(output.displayValue).toBeDisplayString('50\xa0ms');
  });

  it('adjusts scoring based on form factor', async () => {
    const artifactsMobile = generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice: true});
    const contextMobile = generateContext({throttlingMethod: 'simulate'});

    const outputMobile = await TBTAudit.audit(artifactsMobile, contextMobile);
    expect(outputMobile.numericValue).toBeCloseTo(726.5, 1);
    expect(outputMobile.score).toBe(0.37);
    expect(outputMobile.displayValue).toBeDisplayString('730\xa0ms');

    const artifactsDesktop = generateArtifacts({trace, devtoolsLog, TestedAsMobileDevice: false});
    const contextDesktop = generateContext({throttlingMethod: 'simulate'});

    const outputDesktop = await TBTAudit.audit(artifactsDesktop, contextDesktop);
    expect(outputDesktop.numericValue).toBeCloseTo(726.5, 1);
    expect(outputDesktop.score).toBe(0.13);
    expect(outputDesktop.displayValue).toBeDisplayString('730\xa0ms');
  });
});
