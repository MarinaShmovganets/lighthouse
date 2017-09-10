/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as assert from 'assert';
const intercept = require('intercept-stdout');
import {LighthouseAssert} from '../';
import successExpectations from './fixtures/expectations/success-expectations';
import successResults from './fixtures/lighthouse-results/success-results';

describe('Lighthouse assert', () => {
  let stdout;
  const unhook_intercept = intercept((txt: string) => {
    stdout = txt;
  });
  const lighthouseAssert = new LighthouseAssert();
  lighthouseAssert.assert(successResults, successExpectations);
  assert.equal(stdout, '\u001b[32m1 passing\u001b[0m\n');
  unhook_intercept();
});
