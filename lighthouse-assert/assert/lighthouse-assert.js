"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FINAL_URL = 'final url';
class LighthouseAssert {
    /**
     * Constructor
     * @param {Result} lhResults
     * @param {Array<Expectation>} expectations
     * @return {boolean}
     */
    constructor(lhResults, expectations) {
        this.collatedResults = [];
        this.results = lhResults;
        this.expectations = expectations;
    }
    /**
     * Verify if results are equal
     * @return {boolean}
     */
    equal() {
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
        for (const expectation of this.expectations) {
            for (const result of this.results)
                this.collatedResults.push(this.collateAuditResults(result, expectation));
        }
    }
    /**
     * Collate results into comparisons of actual and expected scores on each audit.
     * @param {{url: string, audits: Result}} actual
     * @param {{url: string, audits: Result}} expected
     * @return {{finalUrl: Object, audits: !Array<CollatedAudit>}}
     */
    collateAuditResults(actual, expected) {
        const auditNames = Object.keys(expected.audits);
        const collatedAudits = [];
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
exports.LighthouseAssert = LighthouseAssert;
const OPERAND_EXPECTATION_REGEXP = /^(<=?|>=?)/;
class ObjectDifference {
    /**
     * Constructor
     * @param {string} path
     * @param {ActualAudit} actual
     * @param {ExpectedAudit} expected
     */
    constructor(path, actual, expected) {
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
    getDiff() {
        let diff = {};
        if (this.matchesExpectation())
            return diff;
        // We only care that all expected's own properties are on actual (and not the other way around).
        for (const key of Object.keys(this.expected)) {
            // Bracket numbers, but property names requiring quotes will still be unquoted.
            const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
            const keyPath = this.path + keyAccessor;
            const expectedValue = this.expected[key];
            if (!(key in this.actual)) {
                return { path: keyPath, actual: undefined, expected: expectedValue };
            }
            const actualValue = this.actual[key];
            let difference;
            //@todo use factory. P.S. generics should solve this problem
            if (typeof actualValue === 'boolean' && typeof expectedValue === 'boolean') {
                difference = new BooleanDifference(keyPath, { score: actualValue }, { score: expectedValue });
            }
            else {
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
    matchesExpectation() {
        return Object.is(this.actual, this.expected);
    }
}
class NoneObjectDifference {
    /**
     * Constructor
     * @param {string} path
     * @param {ActualAudit} actual
     * @param {ExpectedAudit} expected
     */
    constructor(path, actual, expected) {
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
    getDiff() {
        let diff = {};
        if (this.matchesExpectation())
            return diff;
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
    matchesExpectation() {
        const actualValue = this.normalize(this.actual.score);
        const normalizedExpected = {
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
    inRange(actual, expected) {
        return actual >= expected.error || actual >= expected.warn && actual < expected.error;
    }
    /**
     * Normalizes score value
     *
     * @param {string|number} value
     * @return {number}
     */
    normalize(value) {
        if (typeof value === 'string') {
            return parseInt(value.replace(OPERAND_EXPECTATION_REGEXP, ''));
        }
        else {
            return value;
        }
    }
}
class BooleanDifference {
    /**
     * Constructor
     * @param {string} path
     * @param {ActualAudit} actual
     * @param {ExpectedAudit} expected
     */
    constructor(path, actual, expected) {
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
    getDiff() {
        if (this.matchesExpectation()) {
            return {};
        }
        else {
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
    matchesExpectation() {
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
    static findDifference(path, actual, expected) {
        let difference;
        //@todo use generics
        if (actual && typeof actual === 'object') {
            difference = new ObjectDifference(path, actual, expected);
        }
        else if (actual && typeof actual.score === 'boolean') {
            difference = new BooleanDifference(path, actual, expected);
        }
        else {
            difference = new NoneObjectDifference(path, actual, expected);
        }
        // @todo add regexp diff class
        return difference.getDiff();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlnaHRob3VzZS1hc3NlcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsaWdodGhvdXNlLWFzc2VydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQW1GQSxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUM7QUFFOUI7SUFLRTs7Ozs7T0FLRztJQUNILFlBQVksU0FBd0IsRUFBRSxZQUFnQztRQVYvRCxvQkFBZSxHQUEwQixFQUFFLENBQUM7UUFXakQsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7UUFDekIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUs7UUFDSCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDekQsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9ELE1BQU0sQ0FBQyxDQUFDLFlBQVksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQzlELENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLGtCQUFrQixHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDM0MsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNMLEdBQUcsQ0FBQyxDQUFDLE1BQU0sV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzVDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7OztP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