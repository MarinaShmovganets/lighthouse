/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview A runner that launches Chrome and executes Lighthouse via DevTools.
 */

import fs from 'fs';
import os from 'os';
import {spawn} from 'child_process';

import {LH_ROOT} from '../../../../root.js';

/** @type {Promise<void>} */
let setupPromise;
async function setup() {
  if (setupPromise) return setupPromise;

  setupPromise = new Promise(resolve => {
    // execFileSync('yarn', ['open-devtools']);
    resolve();
  });
}

/**
 * Launch Chrome and do a full Lighthouse run via DevTools.
 * @param {string} url
 * @param {LH.Config.Json=} configJson
 * @param {{isDebug?: boolean}=} testRunnerOptions
 * @return {Promise<{lhr: LH.Result, artifacts: LH.Artifacts, log: string}>}
 */
async function runLighthouse(url, configJson, testRunnerOptions = {}) {
  await setup();

  const outputDir = fs.mkdtempSync(os.tmpdir() + '/lh-smoke-cdt-runner-');
  const devtoolsDir =
    process.env.DEVTOOLS_PATH || `${LH_ROOT}/.tmp/chromium-web-tests/devtools/devtools-frontend`;
  const args = [
    'run-devtools',
    url,
    `--custom-devtools-frontend=file://${devtoolsDir}/out/Default/gen/front_end`,
    '--output-dir', outputDir,
  ];
  if (configJson) {
    args.push('--config', JSON.stringify(configJson));
  }

  let log = '';
  await new Promise((resolve, reject) => {
    const spawnHandle = spawn('yarn', args);
    spawnHandle.on('close', resolve);
    spawnHandle.on('error', reject);
    spawnHandle.stdout.on('data', data => {
      console.log(data.toString());
      log += `STDOUT: ${data.toString()}`;
    });
    spawnHandle.stderr.on('data', data => {
      console.log(data.toString());
      log += `STDERR: ${data.toString()}`;
    });
  });

  const lhr = JSON.parse(fs.readFileSync(`${outputDir}/lhr-0.json`, 'utf-8'));
  const artifacts = JSON.parse(fs.readFileSync(`${outputDir}/artifacts-0.json`, 'utf-8'));

  if (testRunnerOptions.isDebug) {
    console.log(`${url} results saved at ${outputDir}`);
  } else {
    fs.rmSync(outputDir, {recursive: true, force: true});
  }

  return {lhr, artifacts, log};
}

export {
  runLighthouse,
};
