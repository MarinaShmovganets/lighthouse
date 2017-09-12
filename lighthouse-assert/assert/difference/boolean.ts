/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { IDifference } from './interface';
import { IBooleanActualAudit, IBooleanExpectedAudit, IDiff } from "../types";

export class BooleanDifference implements IDifference {
  private path: string;
  private actual: IBooleanActualAudit;
  private expected: IBooleanExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {IBooleanActualAudit} actual
   * @param {IBooleanExpectedAudit} expected
   */
  constructor(path: string, actual: IBooleanActualAudit, expected: IBooleanExpectedAudit) {
    this.path = path;
    this.actual = actual;
    this.expected = expected;
  }

  /**
   * Find diff
   * @return {IDiff}
   */
  getDiff(): IDiff {
    if (this.matchesExpectation()) {
      return {};
    } else {
      return {path: this.path, actual: this.actual.score, expected: this.expected.score};
    }
  }

  /**
   * Checks if the actual value matches the expectation. Does not recursively search. This supports booleans
   *
   * @return {boolean}
   */
  matchesExpectation(): boolean {
    return this.actual.score == this.expected.score;
  }
}
