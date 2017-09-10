import { IDifference } from './interface';
import { IBooleanActualAudit, IBooleanExpectedAudit, IDiff } from "../types";

export class BooleanDifference implements IDifference {
  private path: string;
  private actual: IBooleanActualAudit;
  private expected: IBooleanExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {IActualAudit} actual
   * @param {IExpectedAudit} expected
   */
  constructor(path: string, actual: IBooleanActualAudit, expected: IBooleanExpectedAudit) {
    this.path = path;
    this.actual = actual;
    this.expected = expected;
  }

  /**
   * Walk down expected result, comparing to actual result. If a difference is found,
   * the path to the difference is returned, along with the expected primitive value
   * and the value actually found at that location. If no difference is found, returns
   * null.
   *
   * Only checks own enumerable properties, not object prototypes, and will loop
   * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
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
