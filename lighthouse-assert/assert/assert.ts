/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {AssertResults} from './assert-results';
import {ICollatedResult, IExpectation, IResult, IStatusCounts} from './types';

export class Assert {
  public collatedResults: Array<ICollatedResult> = [];

  /**
   * Constructor
   * @param {Array<IResult>} results
   * @param {Array<IExpectation>} expectations
   * @return {boolean}
   */
  constructor(results: Array<IResult>, expectations: Array<IExpectation>) {
    const assertResults = new AssertResults();
    this.collatedResults = assertResults.collate(results, expectations);
  }

  /**
   * Verify if results are equal
   * @return {boolean}
   */
  equal(): boolean {
    const notCollatedResults = this.collatedResults.find(result => {
      const auditResults = result.audits.find(audit => !audit.equal);
      return (auditResults && !auditResults.equal) ? true : false;
    });
    return notCollatedResults ? false : true;
  }

  /**
   * Get status counts for collated results
   */
  getStatusCounts() {
    let statusCounts: IStatusCounts = {passed: 0, failed: 0};

    for (const collatedResult of this.collatedResults) {
      // @todo include other results than audits
      for (const audit of collatedResult.audits) {
        (audit && audit.equal) ? statusCounts.passed += 1 : statusCounts.failed += 1;
      }
    }
    return statusCounts;
  }
}
