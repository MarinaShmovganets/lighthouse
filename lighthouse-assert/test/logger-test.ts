import * as assert from 'assert';
import { Logger, Diff } from '../';
import { IReporter } from '../reporter/reporter';

class MockReporter implements IReporter {
  stderr(diff: Diff) {
    return `${diff.path} error
Actual: ${diff.actual}
Expected: ${JSON.stringify(diff.expected, null, 2)}`
  }

  stdoutFailingStatus(count: number) {
    return `${count} failing`;
  }

  stdoutPassingStatus(count: number) {
    return `${count} passing`;
  }
}

describe('logger', () => {
  it('should show status counts number', () => {
    const reporter = new MockReporter();
    const logger = new Logger(reporter);
    const statusCounts = {
      passed: 0,
      failed: 0
    };
    assert.equal(logger.stdoutFailingStatus(statusCounts.failed), '0 failing');
    assert.equal(logger.stdoutPassingStatus(statusCounts.passed), '0 passing');
  });

  it('should show error diff', () => {
    const reporter = new MockReporter();
    const logger = new Logger(reporter);
    const diff: Diff = {
      path: 'test.score',
      actual: 100,
      expected: {
        error: '<90',
        warn: '<80'
      }
    };
    assert.equal(logger.stderr(diff), 'test.score error\nActual: 100\nExpected: {\n  "error": "<90",\n  "warn": "<80"\n}');
  });

});
