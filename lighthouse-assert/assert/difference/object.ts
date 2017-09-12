/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { IDifference } from './interface';
import { INoneObjectActualAudit, INoneObjectExpectedAudit, IDiff, INormalizedExpectedScore } from '../types';
import { inRange } from '../utils';

const OPERAND_EXPECTATION_REGEXP = /^(<=?|>=?)/;

export class ObjectDifference implements IDifference {
  private path: string;
  private actual: INoneObjectActualAudit;
  private expected: INoneObjectExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {IActualAudit} actual
   * @param {IExpectedAudit} expected
   */
  constructor(path: string, actual: INoneObjectActualAudit, expected: INoneObjectExpectedAudit) {
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
    for (const expectationType of Object.keys(this.expected)) {
      const expectedByType = this.expected[expectationType];
      // If they aren't both an object we can't recurse further, so this is the difference.
      if (this.actual.score === null || expectedByType === null ||
        typeof this.actual.score !== 'object' || typeof expectedByType !== 'object' ||
        expectedByType instanceof RegExp) {
        diff = {path: this.path, actual: this.actual.score, expected: this.expected.score};
      }
    }
    return diff;
  }

  /**
   * Checks if the actual value matches the expectation. Does not recursively search. This supports
   * greater than/less than operators, e.g. "<100", ">90"
   *
   * @return {boolean}
   */
  matchesExpectation(): boolean {
    const actualValue = this.normalize(this.actual.score);
    const normalizedExpected: INormalizedExpectedScore = {
      warn: this.normalize(this.expected.score.warn),
      error: this.normalize(this.expected.score.error)
    };
    // @todo check inRange due to symbols like '<=', '>=' etc.
    return inRange(normalizedExpected.error, 100, actualValue);
  }

  /**
   * Normalizes score value
   *
   * @param {string|number} value
   * @return {number}
   */
  private normalize(value: string|number): number {
    if (typeof value === 'string') {
      return parseInt(value.replace(OPERAND_EXPECTATION_REGEXP, ''));
    } else {
      return value;
    }
  }
}
