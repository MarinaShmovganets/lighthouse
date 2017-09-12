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
