export interface Result {
  url: string;
  audits: ActualAudits;
}

export interface Expectation {
  url: string;
  audits: ExpectedAudits;
}

interface ActualAudits {
  [key: string]: ActualAudit
}

interface ActualAudit {
  score: string;
}

interface ExpectedAudits {
  [key: string]: ExpectedAudit;
}

interface ExpectedAudit {
  score: ExpectedScore;
}

interface ExpectedScore {
  error: string;
  warn: string;
}

interface CollatedResult {
  finalUrl: {
    category: string;
    actual: string;
    expected: string;
    equal: boolean;
  };
  audits: Array<CollatedAudit>;
}

interface CollatedAudit {
  category: string;
  actual: ActualAudit;
  expected: ExpectedAudit;
  equal: boolean;
  diff: Diff|Object;
}

interface Diff extends Object {
  path?: string;
  actual?: string;
  expected?: ExpectedScore;
}

const NUMERICAL_EXPECTATION_REGEXP = /^(<=?|>=?)(\d+)$/;
const FINAL_URL = 'final url';

export class LighthouseAssert {
  public collatedResults: Array<CollatedResult> = [];
  private results: Array<Result>;
  private expectations: Array<Expectation>;

  /**
   * Constructor
   * @param {Result} lhResults
   * @param {Array<Expectation>} expectations
   * @return {boolean}
   */
  constructor(lhResults: Array<Result>, expectations: Array<Expectation>) {
    this.results = lhResults;
    this.expectations = expectations;
  }

  /**
   * Verify if results are equal
   * @return {boolean}
   */
  equal(): boolean {
    //@fixme this.collatedResults[0]
    const audits = this.collatedResults[0].audits;
    for (const audit of audits) {
      let equal = audit.equal;
      if (!equal) return equal;
    }
    return true;
  }

  /**
   * Collate results on each expectation.
   */
  collate() {
    for (const expectation of this.expectations) {
      for (const result of this.results)
        this.collatedResults.push(this.collateAuditResults(result, expectation))
    }
  }

  /**
   * Collate results into comparisons of actual and expected scores on each audit.
   * @param {{url: string, audits: Result}} actual
   * @param {{url: string, audits: Result}} expected
   * @return {{finalUrl: Object, audits: !Array<CollatedAudit>}}
   */
  private collateAuditResults(actual: Result, expected: Expectation): CollatedResult {
    const auditNames = Object.keys(expected.audits);
    const collatedAudits: Array<CollatedAudit> = [];
    auditNames.forEach(auditName => {
      const actualResult = actual.audits[auditName];
      if (!actualResult) {
        throw new Error(`Config did not trigger run of expected audit ${auditName}`);
      }

      const expectedResult = expected.audits[auditName];
      const diff = this.findDifference(auditName, actualResult, expectedResult);
      collatedAudits.push({
        category: auditName,
        actual: actualResult,
        expected: expectedResult,
        equal: !Object.keys(diff).length,
        diff: diff
      });
    });

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

  /**
   * Walk down expected result, comparing to actual result. If a difference is found,
   * the path to the difference is returned, along with the expected primitive value
   * and the value actually found at that location. If no difference is found, returns
   * null.
   *
   * Only checks own enumerable properties, not object prototypes, and will loop
   * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
   * @param {string} path
   * @param {*} actual
   * @param {*} expected
   * @return {Diff}
   */
  private findDifference(path: string, actual: ActualAudit|any, expected: ExpectedAudit|any): Diff {
    let diff: Diff = {};

    if (expected && typeof expected === 'object') {
      diff = this.getObjectsDiff(path, actual, expected);
    } else {
      diff = this.getNoneObjectsDiff(path, actual, expected);
    }

    return diff;
  }

  private getObjectsDiff(path: string, actual: ActualAudit|any, expected: ExpectedAudit|any): Diff {
    let diff: Diff = {};
    if (Object.is(actual, expected)) return diff;

    // We only care that all expected's own properties are on actual (and not the other way around).
    for (const key of Object.keys(expected)) {
      // Bracket numbers, but property names requiring quotes will still be unquoted.
      const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
      const keyPath = path + keyAccessor;
      const expectedValue = expected[key];

      if (!(key in actual)) {
        return {path: keyPath, actual: undefined, expected: expectedValue};
      }

      const actualValue = actual[key];
      const subDifference = this.getNoneObjectsDiff(keyPath, actualValue, expectedValue);
      return diff = subDifference;
    }
    return diff;
  }

  private getNoneObjectsDiff(path: string, actual: ActualAudit|any, expected: ExpectedAudit|any): Diff {
    let diff: Diff = {};
    for (const expectationType of Object.keys(expected)) {
      const expectedByType = expected[expectationType];
      if (this.matchesExpectation(actual, expectedByType)) return diff;

      // If they aren't both an object we can't recurse further, so this is the difference.
      if (actual === null || expectedByType === null || typeof actual !== 'object' ||
        typeof expectedByType !== 'object' || expectedByType instanceof RegExp) {
        diff = {
          path,
          actual,
          expected
        };
      }
    }
    return diff;
  }

  /**
   * Checks if the actual value matches the expectation. Does not recursively search. This supports
   *    - Greater than/less than operators, e.g. "<100", ">90"
   *    - Regular expressions
   *    - Strict equality
   *
   * @param {ActualAudit} actual
   * @param {ExpectedAudit|any} expected
   * @return {boolean}
   */
  private matchesExpectation(actual: ActualAudit|any, expected: ExpectedAudit|any): boolean {
    if (typeof actual === 'string' && NUMERICAL_EXPECTATION_REGEXP.test(expected)) {
      const parts = expected.match(NUMERICAL_EXPECTATION_REGEXP);
      const number = parseInt(parts[2]);
      //@fixme regexp
      const actualValue = parseInt(actual.replace(/<|>/, ''));
      return actualValue >= number;
    } else {
      return (typeof actual === 'string' && expected instanceof RegExp && expected.test(actual));
    }
  }
}
