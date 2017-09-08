"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FINAL_URL = 'final url';
class Assert {
    /**
     * Constructor
     * @param {IResult} lhResults
     * @param {Array<IExpectation>} expectations
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
        this.expectations.forEach((expectation, index) => {
            this.collatedResults.push(this.collateAuditResults(this.results[index], expectation));
        });
    }
    /**
     * Get status counts for collated results
     */
    getStatusCounts() {
        let statusCounts = { passed: 0, failed: 0 };
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
     * @param {{url: string, audits: IResult}} actual
     * @param {{url: string, audits: IResult}} expected
     * @return {{finalUrl: Object, audits: !Array<ICollatedAudit>}}
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
class DeepObjectDifference {
    /**
     * Constructor
     * @param {string} path
     * @param {IActualAudit} actual
     * @param {IExpectedAudit} expected
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
     * @return {IDiff}
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
                difference = new ObjectDifference(keyPath, { score: actualValue }, { score: expectedValue });
            }
            const subDifference = difference.getDiff();
            if (subDifference)
                return diff = subDifference;
        }
        return diff;
    }
    /**
     * Checks if the actual and expected object values are equal
     *
     * @return {boolean}
     */
    matchesExpectation() {
        return Object.is(this.actual, this.expected);
    }
}
class ObjectDifference {
    /**
     * Constructor
     * @param {string} path
     * @param {IActualAudit} actual
     * @param {IExpectedAudit} expected
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
     * @return {IDiff}
     */
    getDiff() {
        let diff = {};
        if (this.matchesExpectation())
            return diff;
        for (const expectationType of Object.keys(this.expected)) {
            const expectedByType = this.expected[expectationType];
            // If they aren't both an object we can't recurse further, so this is the difference.
            if (this.actual.score === null || expectedByType === null ||
                typeof this.actual.score !== 'object' || typeof expectedByType !== 'object' ||
                expectedByType instanceof RegExp) {
                diff = { path: this.path, actual: this.actual.score, expected: this.expected.score };
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
     * @param {INormalizedExpectedScore} expected
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
     * @param {IActualAudit} actual
     * @param {IExpectedAudit} expected
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
     * @return {IDiff}
     */
    getDiff() {
        if (this.matchesExpectation()) {
            return {};
        }
        else {
            return { path: this.path, actual: this.actual.score, expected: this.expected.score };
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
     * @param {*} actual
     * @param {*} expected
     * @return {IDiff}
     */
    static findDifference(path, actual, expected) {
        let difference;
        //@todo use generics
        if (actual && typeof actual === 'object') {
            difference = new DeepObjectDifference(path, actual, expected);
        }
        else if (actual && typeof actual.score === 'boolean') {
            difference = new BooleanDifference(path, actual, expected);
        }
        else {
            difference = new ObjectDifference(path, actual, expected);
        }
        // @todo add regexp diff class
        return difference.getDiff();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXNzZXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBbUZBLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQztBQUU5QjtJQUtFOzs7OztPQUtHO0lBQ0gsWUFBWSxTQUF5QixFQUFFLFlBQWlDO1FBVmpFLG9CQUFlLEdBQTJCLEVBQUUsQ0FBQztRQVdsRCxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNuQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSztRQUNILE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUN6RCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLENBQUMsWUFBWSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7UUFDOUQsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQztJQUMzQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ0wsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQ3JCLENBQUMsV0FBVyxFQUFFLEtBQUs7WUFDZixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQUEsQ0FBQyxDQUFDLENBQUM7SUFDbEcsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQUNiLElBQUksWUFBWSxHQUFrQixFQUFDLE1BQU0sRUFBRSxDQUFDLEVB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