/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as assert from 'assert';

import {Assert} from '../';

import defaultExpectations from './fixtures/expectations/default-expectations';
import pwaExpectations from './fixtures/expectations/pwa-expectations';
import expectedAssertResults from './fixtures/expected-assert-results';
import defaultResults from './fixtures/lighthouse-results/default-results';
import pwaResults from './fixtures/lighthouse-results/pwa-results';

describe('lighthouse-assert', () => {
  it('should build collated results', () => {
    const lighthouseAssert = new Assert(defaultResults, defaultExpectations);
    lighthouseAssert.collate();
    const collatedResults = lighthouseAssert.collatedResults;
    assert.deepEqual(collatedResults, expectedAssertResults);
  });

  it('should return false if results less the expected', () => {
    const lighthouseAssert = new Assert(defaultResults, defaultExpectations);
    lighthouseAssert.collate();
    assert.ok(!lighthouseAssert.equal());
  });

  it('should fail if pwa results are not the same as expected', () => {
    const lighthouseAssert = new Assert(pwaResults, pwaExpectations);
    lighthouseAssert.collate();
    assert.ok(!lighthouseAssert.equal());
  });

  describe('status count of results', () => {
    const lighthouseAssert = new Assert(defaultResults, defaultExpectations);
    lighthouseAssert.collate();
    const statusCounts = lighthouseAssert.getStatusCounts();
    const expectedStatusCounts = {passed: 3, failed: 1};
    assert.deepEqual(statusCounts, expectedStatusCounts);
  })
});
