import { ICollatedResult, IResult, IExpectation, IStatusCounts } from './types';
import { AssertResults } from './assert-results';

export class Assert {
  public collatedResults: Array<ICollatedResult> = [];

  /**
   * Constructor
   * @param {IResult} results
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
