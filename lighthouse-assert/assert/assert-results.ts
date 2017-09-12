/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {DifferenceFactory} from './difference/diff-factory';
import {ICollatedAudit, ICollatedResult, IExpectation, IResult} from './types';

const FINAL_URL = 'final url';

export class AssertResults {
  private collatedResults: Array<ICollatedResult> = [];
  /**
   * Collate results on each expectation.
   */
  collate(results: Array<IResult>, expectations: Array<IExpectation>) {
    expectations.forEach(
        (expectation, index) => {
            this.collatedResults.push(this.collateAuditResults(results[index], expectation))});
    return this.collatedResults;
  }

  /**
   * Collate results into comparisons of actual and expected scores on each audit.
   * @param {IResult} actual
   * @param {IExpectation} expected
   * @return {ICollatedResult}
   */
  private collateAuditResults(actual: IResult, expected: IExpectation): ICollatedResult {
    const collatedAudits: Array<ICollatedAudit> = [];
    for (const auditName in expected.audits) {
      const actualResult = actual.audits[auditName];
      if (!actualResult) {
        throw new Error(`Config did not trigger run of expected audit ${auditName}`);
      }

      const expectedResult = expected.audits[auditName];
      const diff = DifferenceFactory.findDifference(auditName, actualResult, expectedResult);
      collatedAudits.push({
        category: auditName,
        actual: actualResult,
        expected: expectedResult,
        equal: !Object.keys(diff).length,
        diff: diff
      });
    }

    return {
      finalUrl: {
        category: FINAL_URL,
        actual: actual.url,
        expected: expected.url,
        equal: actual.url === expected.url
      },
      audits: collatedAudits
    };
  }
}
