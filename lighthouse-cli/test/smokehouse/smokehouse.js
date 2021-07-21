/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview An end-to-end test runner for Lighthouse. Takes a set of smoke
 * test definitions and a method of running Lighthouse, returns whether all the
 * smoke tests passed.
 */

const log = require('lighthouse-logger');
const cliLighthouseRunner = require('./lighthouse-runners/cli.js').runLighthouse;
const getAssertionReport = require('./report-assert.js');
const LocalConsole = require('./lib/local-console.js');
const ConcurrentMapper = require('./lib/concurrent-mapper.js');

/* eslint-disable no-console */

/** @typedef {import('./lib/child-process-error.js')} ChildProcessError */

// The number of concurrent (`!runSerially`) tests to run if `jobs` isn't set.
const DEFAULT_CONCURRENT_RUNS = 5;
const DEFAULT_RETRIES = 0;

/**
 * @typedef SmokehouseResult
 * @property {string} id
 * @property {number} passed
 * @property {number} failed
 */

/**
 * Runs the selected smoke tests. Returns whether all assertions pass.
 * @param {Array<Smokehouse.TestDfn>} smokeTestDefns
 * @param {Smokehouse.SmokehouseOptions} smokehouseOptions
 * @return {Promise<{success: boolean, testResults: SmokehouseResult[]}>}
 */
async function runSmokehouse(smokeTestDefns, smokehouseOptions) {
  const {
    isDebug,
    jobs = DEFAULT_CONCURRENT_RUNS,
    retries = DEFAULT_RETRIES,
    lighthouseRunner = cliLighthouseRunner,
    takeNetworkRequestUrls,
  } = smokehouseOptions;
  assertPositiveInteger('jobs', jobs);
  assertNonNegativeInteger('retries', retries);

  // Run each testDefn in parallel based on the concurrencyLimit.
  const concurrentMapper = new ConcurrentMapper();

  const testOptions = {isDebug, retries, lighthouseRunner, takeNetworkRequestUrls};
  const smokePromises = smokeTestDefns.map(testDefn => {
    // If defn is set to `runSerially`, we'll run its tests in succession, not parallel.
    const concurrency = testDefn.runSerially ? 1 : jobs;
    return concurrentMapper.runInPool(() => runSmokeTest(testDefn, testOptions), {concurrency});
  });
  const testResults = await Promise.all(smokePromises);

  // Print final summary.
  let passingCount = 0;
  let failingCount = 0;
  for (const testResult of testResults) {
    passingCount += testResult.passed;
    failingCount += testResult.failed;
  }
  if (passingCount) console.log(log.greenify(`${passingCount} expectation(s) passing`));
  if (failingCount) console.log(log.redify(`${failingCount} expectation(s) failing`));

  // Print id(s) and fail if there were failing tests.
  const failingDefns = testResults.filter(result => result.failed);
  if (failingDefns.length) {
    const testNames = failingDefns.map(d => d.id).join(', ');
    console.error(log.redify(`We have ${failingDefns.length} failing smoketest(s): ${testNames}`));
    return {success: false, testResults};
  }

  return {success: true, testResults};
}

/**
 * @param {string} loggableName
 * @param {number} value
 */
function assertPositiveInteger(loggableName, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${loggableName} must be a positive integer`);
  }
}
/**
 * @param {string} loggableName
 * @param {number} value
 */
function assertNonNegativeInteger(loggableName, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${loggableName} must be a non-negative integer`);
  }
}

/** @param {string} str */
function purpleify(str) {
  return `${log.purple}${str}${log.reset}`;
}

/**
 * Run Lighthouse in the selected runner.
 * @param {Smokehouse.TestDfn} smokeTestDefn
 * @param {{isDebug?: boolean, retries: number, lighthouseRunner: Smokehouse.LighthouseRunner, takeNetworkRequestUrls?: () => string[]}} testOptions
 * @return {Promise<SmokehouseResult>}
 */
async function runSmokeTest(smokeTestDefn, testOptions) {
  const {id, config: configJson, expectations} = smokeTestDefn;
  const {lighthouseRunner, retries, isDebug, takeNetworkRequestUrls} = testOptions;
  const requestedUrl = expectations.lhr.requestedUrl;

  console.log(`${purpleify(id)} smoketest starting…`);

  // Rerun test until there's a passing result or retries are exhausted to prevent flakes.
  let result;
  let report;
  const bufferedConsole = new LocalConsole();
  for (let i = 0; i <= retries; i++) {
    if (i === 0) {
      bufferedConsole.log(`${purpleify(id)}: testing '${requestedUrl}'…`);
    } else {
      bufferedConsole.log(`  Retrying run (${i} out of ${retries} retries)…`);
    }

    // Run Lighthouse.
    try {
      result = {
        ...await lighthouseRunner(requestedUrl, configJson, {isDebug}),
        networkRequests: takeNetworkRequestUrls ? takeNetworkRequestUrls() : undefined,
      };
    } catch (e) {
      // Clear the network requests so that when we retry, we don't see duplicates.
      if (takeNetworkRequestUrls) takeNetworkRequestUrls();

      logChildProcessError(bufferedConsole, e);
      continue; // Retry, if possible.
    }

    // Assert result.
    report = getAssertionReport(result, expectations, {isDebug});
    if (report.failed) {
      bufferedConsole.log(`  ${report.failed} assertion(s) failed.`);
      continue; // Retry, if possible.
    }

    break; // Passing result, no need to retry.
  }

  bufferedConsole.log(`  smoketest results:`);

  // Write result log if we have one.
  if (result) bufferedConsole.write(result.log);

  // If there's not an assertion report, not much detail to share but a failure.
  if (report) bufferedConsole.write(report.log);
  const passed = report ? report.passed : 0;
  const failed = report ? report.failed : 1;

  const correctStr = logAssertString(passed);
  const colorFn = passed === 0 ? log.redify : log.greenify;
  bufferedConsole.log(`  Correctly passed ${colorFn(correctStr)}`);

  if (failed) {
    const failedString = logAssertString(failed);
    const failedColorFn = failed === 0 ? log.greenify : log.redify;
    bufferedConsole.log(`  Failed ${failedColorFn(failedString)}`);
  }
  bufferedConsole.log(`${purpleify(id)} smoketest complete.`);

  // Log all at once.
  console.log(''); // extra line break
  console.log(bufferedConsole.getLog());

  return {
    id,
    passed,
    failed,
  };
}

/**
 * Logs an error to the console, including stdout and stderr if `err` is a
 * `ChildProcessError`.
 * @param {LocalConsole} localConsole
 * @param {ChildProcessError|Error} err
 */
function logChildProcessError(localConsole, err) {
  if ('stdout' in err && 'stderr' in err) {
    localConsole.adoptStdStrings(err);
  }

  localConsole.log(log.redify('Error: ') + err.message);
}

/**
 * @param {number} count
 * @return {string}
 */
function logAssertString(count) {
  const plural = count === 1 ? '' : 's';
  return `${count} assertion${plural}`;
}

module.exports = {
  runSmokehouse,
};
