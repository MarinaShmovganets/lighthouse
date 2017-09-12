/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { IDifference } from './interface';
import { IActualAudit, IExpectedAudit, IDiff } from '../types';
import { BooleanDifference } from './boolean';
import { ObjectDifference } from './object';

export class DeepObjectDifference implements IDifference {
  private path: string;
  private actual: IActualAudit;
  private expected: IExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {IActualAudit} actual
   * @param {IExpectedAudit} expected
   */
  constructor(path: string, actual: IActualAudit, expected: IExpectedAudit) {
    this.path = path;
    this.actual = actual;
    this.expected = expected;
  }

  /**
   * Find diff
   *
   * @return {IDiff}
   */
  getDiff(): IDiff {
    let diff: IDiff = {};

    if (this.matchesExpectation()) return diff;

    // We only care that all expected's own properties are on actual (and not the other way around).
    for (const key of Object.keys(this.expected)) {
      // Bracket numbers, but property names requiring quotes will still be unquoted.
      const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
      const keyPath = this.path + keyAccessor;
      let expectedValue = this.expected[key];
      if (typeof expectedValue === 'string') {
        expectedValue = {
          warn: expectedValue,
          error: expectedValue
        };
      }

      if (!(key in this.actual)) {
        return {
          path: keyPath,
          actual: undefined,
          expected: expectedValue
        };
      }

      const actualValue = this.actual[key];
      let difference;
      if (typeof actualValue === 'boolean' && typeof expectedValue === 'boolean') {
        difference = new BooleanDifference(keyPath, { score: actualValue }, { score: expectedValue });
      } else {
        difference = new ObjectDifference(keyPath, { score: actualValue }, { score: expectedValue });
      }
      const subDifference = difference.getDiff();
      if (subDifference) return diff = subDifference;
    }
    return diff;
  }

  /**
   * Checks if the actual and expected object values are equal
   *
   * @return {boolean}
   */
  matchesExpectation(): boolean {
    return Object.is(this.actual, this.expected);
  }
}
