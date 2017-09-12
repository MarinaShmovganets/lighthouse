/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import * as assert from 'assert';

import { inRange } from '../assert/utils';

describe('Assert utils', () => {
  describe('when actual result', () => {
    it('should be in warn and error range', () => {
      const warn = 75;
      const error = 60;
      const actual = 65;
      assert.ok(inRange(error, warn, actual));
    });

    it('should not be in range if less than error', () => {
      const warn = 85;
      const error = 65;
      const actual = 60;
      assert.ok(!inRange(error, warn, actual));
    });

    it('should not be in range if more than warn', () => {
      const warn = 75;
      const error = 60;
      const actual = 80;
      assert.ok(!inRange(error, warn, actual));
    });
  });
});
