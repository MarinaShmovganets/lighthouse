import { IDifference } from './interface';
import { INoneObjectActualAudit, INoneObjectExpectedAudit, IDiff, INormalizedExpectedScore } from "../types";

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
   * Walk down expected result, comparing to actual result. If a difference is found,
   * the path to the difference is returned, along with the expected primitive value
   * and the value actually found at that location. If no difference is found, returns
   * null.
   *
   * Only checks own enumerable properties, not object prototypes, and will loop
   * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
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
    return this.inRange(actualValue, normalizedExpected);
  }

  /**
   * Checks if the actual value in warning and error range
   *
   * @param {number} actual
   * @param {INormalizedExpectedScore} expected
   * @return {boolean}
   */
  private inRange(actual: number, expected: INormalizedExpectedScore): boolean {
    return actual >= expected.error || actual >= expected.warn && actual < expected.error;
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
