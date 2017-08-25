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
  [key: string]: any;
}

interface NoneObjectActualAudit {
  score: string|number;
  [key: string]: string|number;
}

interface BooleanActualAudit {
  score: boolean;
  [key: string]: boolean;
}

interface ExpectedAudits {
  [key: string]: ExpectedAudit;
}

interface ExpectedAudit {
  score: ExpectedScore;
  [key: string]: ExpectedScore;
}

interface NoneObjectExpectedAudit {
  score: ExpectedScore;
  [key: string]: ExpectedScore;
}

interface BooleanExpectedAudit {
  score: boolean;
  [key: string]: boolean;
}

interface ExpectedScore {
  error: string;
  warn: string;
  [key: string]: string;
}

interface NormalizedExpectedScore {
  error: number;
  warn: number;
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

export interface Diff extends Object {
  path?: string;
  actual?: string|number|boolean;
  expected?: ExpectedScore|boolean;
}

export interface StatusCounts extends Object {
  passed: number;
  failed: number;
}

const FINAL_URL = 'final url';

export class Assert {
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
    const notCollatedResults = this.collatedResults.find(result => {
      const auditResults = result.audits.find(audit => !audit.equal);
      return (auditResults && !auditResults.equal) ? true : false;
    });
    return notCollatedResults ? false : true;
  }

  /**
   * Collate results on each expectation.
   */
  collate() {
    this.expectations.forEach((expectation, index) => {
      this.collatedResults.push(this.collateAuditResults(this.results[index], expectation))
    });
  }

  /**
   * Get status counts for collated results
   */
  getStatusCounts() {
    let statusCounts: StatusCounts = {
      passed: 0,
      failed: 0
    };

    for (const collatedResult of this.collatedResults) {
      // @todo include other results then audits
      for (const audit of collatedResult.audits) {
        (audit && audit.equal) ? statusCounts.passed += 1 : statusCounts.failed += 1;
      }
    }
    return statusCounts;
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
      const diff = DifferenceFactory.findDifference(auditName, actualResult, expectedResult);
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
}

const OPERAND_EXPECTATION_REGEXP = /^(<=?|>=?)/;

interface DifferenceInterface {
  getDiff: () => Diff;
  matchesExpectation: () => boolean;
}

class ObjectDifference implements DifferenceInterface {
  private path: string;
  private actual: ActualAudit;
  private expected: ExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {ActualAudit} actual
   * @param {ExpectedAudit} expected
   */
  constructor(path: string, actual: ActualAudit, expected: ExpectedAudit) {
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
   * @return {Diff}
   */
  getDiff(): Diff {
    let diff: Diff = {};

    if (this.matchesExpectation()) return diff;

    // We only care that all expected's own properties are on actual (and not the other way around).
    for (const key of Object.keys(this.expected)) {
      // Bracket numbers, but property names requiring quotes will still be unquoted.
      const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
      const keyPath = this.path + keyAccessor;
      const expectedValue = this.expected[key];

      if (!(key in this.actual)) {
        return {path: keyPath, actual: undefined, expected: expectedValue};
      }

      const actualValue = this.actual[key];
      let difference;
      //@todo use factory. P.S. generics should solve this problem
      if (typeof actualValue === 'boolean' && typeof expectedValue === 'boolean') {
        difference = new BooleanDifference(keyPath, { score: actualValue }, { score: expectedValue });
      } else {
        difference = new NoneObjectDifference(keyPath, { score: actualValue }, { score: expectedValue });
      }
      const subDifference = difference.getDiff();
      if (subDifference)
        return diff = subDifference;
    }
    return diff;
  }

  /**
   * Checks if the actual value matches the expectation. Does not recursively search. This supports
   *    - Greater than/less than operators, e.g. "<100", ">90"
   *    - Regular expressions
   *    - Strict equality
   *
   * @return {boolean}
   */
  matchesExpectation(): boolean {
    return Object.is(this.actual, this.expected);
  }
}


class NoneObjectDifference implements DifferenceInterface {
  private path: string;
  private actual: NoneObjectActualAudit;
  private expected: NoneObjectExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {ActualAudit} actual
   * @param {ExpectedAudit} expected
   */
  constructor(path: string, actual: NoneObjectActualAudit, expected: NoneObjectExpectedAudit) {
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
   * @return {Diff}
   */
  getDiff(): Diff {
    let diff: Diff = {};

    if (this.matchesExpectation()) return diff;

    for (const expectationType of Object.keys(this.expected)) {
      const expectedByType = this.expected[expectationType];
      // If they aren't both an object we can't recurse further, so this is the difference.
      if (this.actual.score === null || expectedByType === null || typeof this.actual.score !== 'object' ||
        typeof expectedByType !== 'object' || expectedByType instanceof RegExp) {
        diff = {
          path: this.path,
          actual: this.actual.score,
          expected: this.expected.score
        };
      }
    }
    return diff;
  }

  /**
   * Checks if the actual value matches the expectation. Does not recursively search. This supports
   *    - Greater than/less than operators, e.g. "<100", ">90"
   *
   * @return {boolean}
   */
  matchesExpectation(): boolean {
    const actualValue = this.normalize(this.actual.score);
    const normalizedExpected: NormalizedExpectedScore = {
      warn: this.normalize(this.expected.score.warn),
      error: this.normalize(this.expected.score.error)
    };
    return this.inRange(actualValue, normalizedExpected);
  }

  /**
   * Checks if the actual value in warning and error range
   *
   * @param {number} actual
   * @param {NormalizedExpectedScore} expected
   * @return {boolean}
   */
  private inRange(actual: number, expected: NormalizedExpectedScore): boolean {
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

class BooleanDifference implements DifferenceInterface {
  private path: string;
  private actual: BooleanActualAudit;
  private expected: BooleanExpectedAudit;

  /**
   * Constructor
   * @param {string} path
   * @param {ActualAudit} actual
   * @param {ExpectedAudit} expected
   */
  constructor(path: string, actual: BooleanActualAudit, expected: BooleanExpectedAudit) {
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
   * @return {Diff}
   */
  getDiff(): Diff {
    if (this.matchesExpectation()) {
      return {};
    } else {
      return {
        path: this.path,
        actual: this.actual.score,
        expected: this.expected.score
      };
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


class DifferenceFactory {
  /**
   * Find difference comparing to actual result.
   *
   * @param {string} path
   * @param {ActualAudit|*} actual
   * @param {ExpectedAudit|*} expected
   * @return {Diff}
   */
  static findDifference(path: string, actual: any, expected: any): Diff {
    let difference;
    //@todo use generics
    if (actual && typeof actual === 'object') {
      difference = new ObjectDifference(path, actual, expected);
    } else if (actual && typeof actual.score === 'boolean') {
      difference = new BooleanDifference(path, actual, expected);
    } else {
      difference = new NoneObjectDifference(path, actual, expected);
    }
    // @todo add regexp diff class
    return difference.getDiff();
  }
}
