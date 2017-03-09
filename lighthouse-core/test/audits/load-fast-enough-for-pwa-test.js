/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const FastPWAAudit = require('../../audits/load-fast-enough-for-pwa');
const TTIAudit = require('../../audits/time-to-interactive');
const Audit = require('../../audits/audit.js');
const assert = require('assert');
const traceEvents = require('../fixtures/traces/progressive-app.json');

const GatherRunner = require('../../gather/gather-runner.js');
const computedArtifacts = GatherRunner.instantiateComputedArtifacts();

function generateArtifactsWithTrace(trace) {
  return Object.assign(computedArtifacts, {
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: Array.isArray(trace) ? trace : trace.traceEvents}
    }
  });
}

/* eslint-env mocha */
describe('PWA: load-fast-enough-for-pwa audit', () => {
  it('returns boolean based on TTI value', () => {
    return FastPWAAudit.audit(generateArtifactsWithTrace(traceEvents)).then(result => {
      assert.equal(result.rawValue, true, 'fixture trace is not passing audit');
    }).catch(err => {
      assert.ok(false, err);
    });
  });

  it('fails a bad TTI value', () => {
    // mock a return for the TTI Audit
    const origTTI = TTIAudit.audit;
    const mockTTIResult = {extendedInfo: {value: {timings: {timeToInteractive: 15000}}}};
    TTIAudit.audit = _ => Promise.resolve(mockTTIResult);

    return FastPWAAudit.audit(generateArtifactsWithTrace(traceEvents)).then(result => {
      assert.equal(result.rawValue, false, 'not failing a long TTI value');
      TTIAudit.audit = origTTI;
    }).catch(err => {
      assert.ok(false, err);
    });
  });
});
