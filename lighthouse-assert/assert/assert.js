"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FINAL_URL = 'final url';
class Assert {
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
     * Get status counts for collated results
     */
    getStatusCounts() {
        let statusCounts = {
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
exports.Assert = Assert;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNzZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBd0ZBLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQztBQUU5QjtJQUtFOzs7OztPQUtHO0lBQ0gsWUFBWSxTQUF3QixFQUFFLFlBQWdDO1FBVi9ELG9CQUFlLEdBQTBCLEVBQUUsQ0FBQztRQVdqRCxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNuQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSztRQUNILE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUN6RCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ0wsR0FBRyxDQUFDLENBQUMsTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDNUMsR0FBRyxDQUFDLENBQUMsTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDaEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQzVFLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlO1FBQ2IsSUFBSSxZ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