#!/usr/bin/env node
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const path = require('path');
const spawnSync = require('child_process').spawnSync;
const yargs = require('yargs');
const log = require('lighthouse-logger');
const LighthouseAssert = require('../../../lighthouse-assert').LighthouseAssert;

const DEFAULT_CONFIG_PATH = 'pwa-config';
const DEFAULT_EXPECTATIONS_PATH = 'pwa-expectations';
const ASSERT_EXPECTATIONS_PATH = 'perf-integration/expectations';

const PROTOCOL_TIMEOUT_EXIT_CODE = 67;
const RETRIES = 3;

/**
 * Attempt to resolve a path locally. If this fails, attempts to locate the path
 * relative to the current working directory.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrCwd(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve('./' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(process.cwd(), payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

/**
 * Launch Chrome and do a full Lighthouse run.
 * @param {string} url
 * @param {string} configPath
 * @param {string=} saveAssetsPath
 * @param {string=} expectationsPath
 * @return {!LighthouseResults}
 */
function runLighthouse(url, configPath, saveAssetsPath, expectationsPath) {
  const command = 'node';
  const args = [
    'lighthouse-cli/index.js',
    url,
    `--config-path=${configPath}`,
    '--output=json',
    '--quiet',
    '--port=0'
  ];

  if (saveAssetsPath) {
    args.push('--save-assets');
    args.push(`--output-path=${saveAssetsPath}`);
  }

  if (expectationsPath) {
    args.push(`--expectations-path=${expectationsPath}`);
  }

  // Lighthouse sometimes times out waiting to for a connection to Chrome in CI.
  // Watch for this error and retry relaunching Chrome and running Lighthouse up
  // to RETRIES times. See https://github.com/GoogleChrome/lighthouse/issues/833
  let runResults;
  let runCount = 0;
  do {
    if (runCount > 0) {
      console.log('  Lighthouse error: timed out waiting for debugger connection. Retrying...');
    }

    runCount++;
    console.log(`${log.dim}$ ${command} ${args.join(' ')} ${log.reset}`);
    runResults = spawnSync(command, args, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit']});
  } while (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE && runCount <= RETRIES);

  if (runResults.status === PROTOCOL_TIMEOUT_EXIT_CODE) {
    console.error(`Lighthouse debugger connection timed out ${RETRIES} times. Giving up.`);
    process.exit(1);
  } else if (runResults.status !== 0) {
    console.error(`Lighthouse run failed with exit code ${runResults.status}. stderr to follow:`);
    console.error(runResults.stderr);
    process.exit(runResults.status);
  }

  if (saveAssetsPath) {
    // If assets were saved, the JSON output was written to the specified path instead of stdout
    return require(resolveLocalOrCwd(saveAssetsPath));
  }

  try {
    return JSON.parse(runResults.stdout);
  } catch(e) {
    console.log(runResults.stdout);
  }
}

const cli = yargs
  .help('help')
  .describe({
    'config-path': 'The path to the config JSON file',
    'expectations-path': 'The path to the expected audit results file',
    'save-assets-path': 'Saves assets to the named path if set',
    'run-integrated-lighthouse-assert': 'Run lighthouse with integrated assert'
  })
  .default('config-path', DEFAULT_CONFIG_PATH)
  .default('expectations-path', DEFAULT_EXPECTATIONS_PATH)
  .default('run-integrated-lighthouse-assert', false)
  .argv;

const configPath = resolveLocalOrCwd(cli['config-path']);
const assetsPath = cli['save-assets-path'];

function runStandaloneLighthouseAssert() {
  const expectations = require(resolveLocalOrCwd(cli['expectations-path']));
  const results = [];

  expectations.forEach(expected => {
    console.log(`Checking '${expected.initialUrl}'...`);
    const lhResults = runLighthouse(expected.initialUrl, configPath, assetsPath);
    results.push(lhResults);
  });

  const lighthouseAssert = new LighthouseAssert();
  lighthouseAssert.assert(results, expectations);
}

function runIntegratedLighthouseAssert() {
  runLighthouse('http://localhost:10200/online-only.html', configPath, assetsPath, resolveLocalOrCwd(ASSERT_EXPECTATIONS_PATH));
}

if (cli['run-integrated-lighthouse-assert']) {
  runIntegratedLighthouseAssert();
} else {
  runStandaloneLighthouseAssert();
}

