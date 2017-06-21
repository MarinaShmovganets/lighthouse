/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const opn = require('opn');
const args = require('yargs')
  .example('node $0 --input-root dir-with-subdirectories')
  .example('node $0 --inputs out-1 out-2 out-3')
  .describe({
    'inputs': 'paths to out directory generated by measure.js',
    'input-root': 'path to directory where every sub-directory is used as an input'
  })
  .array('inputs').argv;

const constants = require('./constants');
const utils = require('./utils');

/**
 * Run analyze.js on each of the outs and then
 * aggregate all the results by metric.
 */
function main() {
  const inputPaths = getInputPaths();
  analyzeInputPaths(inputPaths);
  const results = {};
  for (const inputPath of inputPaths) {
    const result = fs.readFileSync(
      path.resolve(inputPath, constants.GENERATED_RESULTS_FILENAME),
      'utf-8'
    );
    results[path.basename(inputPath)] = /** @type {!ResultsByMetric} */ (JSON.parse(
      result.replace('var generatedResults = ', '')
    ));
  }

  const groupByMetricResults = groupByMetric(results);

  if (!utils.isDir(constants.OUT_PATH)) {
    fs.mkdirSync(constants.OUT_PATH);
  }
  fs.writeFileSync(
    path.resolve(constants.OUT_PATH, 'dashboard-results.js'),
    `const dashboardResults = ${JSON.stringify(groupByMetricResults, undefined, 2)}`
  );

  if (process.env.CI) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('Opening the dashboard web page...');
  opn(path.resolve(__dirname, 'dashboard', 'index.html'));
}

main();

/**
 *
 * @param {!AggregatedResults} results
 * @return {!GroupByMetricResults}
 */
function groupByMetric(results) {
  return Object.keys(results).reduce(
    (acc, batchId) => {
      const batchResults = results[batchId];
      Object.keys(batchResults).forEach(metricId => {
        if (!acc[metricId]) {
          acc[metricId] = {};
        }
        const sites = batchResults[metricId];
        sites.forEach(site => {
          if (!acc[metricId][site.site]) {
            acc[metricId][site.site] = {};
          }
          acc[metricId][site.site][batchId] = site.metrics;
        });
      });
      return acc;
    },
    {}
  );
}

/**
 * @param {!Array<string>} inputPaths
 */
function analyzeInputPaths(inputPaths) {
  for (const inputPath of inputPaths) {
    childProcess.execSync(`node analyze.js ${inputPath}`, {
      env: Object.assign({}, process.env, {
        CI: '1'
      })
    });
  }
}

/**
 * Returns a list of out paths generated by measure.js
 * @return {!Array<string>}
 */
function getInputPaths() {
  if (args.inputRoot) {
    return fs
      .readdirSync(path.resolve(__dirname, args.inputRoot))
      .map(pathComponent => path.resolve(__dirname, args.inputRoot, pathComponent))
      .filter(inputPath => utils.isDir(inputPath));
  }
  if (args.inputs) {
    return args.inputs.map(p => path.resolve(__dirname, p));
  }
  // eslint-disable-next-line no-console
  console.log('ERROR: must pass in --input-root or --inputs (see --help for more info)');
  process.exit(1);
}

/**
 * @typedef {!Object<string, !BatchResultsBySite}
 */
let GroupByMetricResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Object<string, !Object<string, !Array<{timing: number}>>>}
 */
let BatchResultsBySite; // eslint-disable-line no-unused-vars
