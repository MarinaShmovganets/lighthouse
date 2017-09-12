import { ICollatedResult, IResult, IExpectation, ICollatedAudit } from './types';
import { DifferenceFactory } from './difference/diff-factory';

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
   * @param {{url: string, audits: IResult}} actual
   * @param {{url: string, audits: IResult}} expected
   * @return {{finalUrl: Object, audits: !Array<ICollatedAudit>}}
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
