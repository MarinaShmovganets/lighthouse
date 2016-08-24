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
const Audit = require('../../audits/interstitial.js');
const assert = require('assert');

/* global describe, it*/

describe('Mobile-friendly: interstitial audit', () => {
  it('fails when no input present', () => {
    return assert.equal(Audit.audit({}).rawValue, false);
  });

  it('fails when input is of incorrect type', () => {
    return assert.equal(Audit.audit({
      Interstitial: 3
    }).rawValue, false);
  });

  it('fails when element array is non-empty', () => {
    return assert.equal(Audit.audit({
      Interstitial: [
        'x'
      ]
    }).rawValue, false);
  });

  it('passes when widths match', () => {
    return assert.equal(Audit.audit({
      Interstitial: []
    }).rawValue, true);
  });
});
