#!/usr/bin/env node
/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const environment = require('../lighthouse-core/lib/environment.js');
if (!environment.checkNodeCompatibility()) {
  console.warn('Compatibility error', 'Lighthouse requires node 5+ or 4 with --harmony');
  process.exit(1);
}

const path = require('path');
const yargs = require('yargs');
const Printer = require('./printer');
const lighthouse = require('../lighthouse-core');
const assetSaver = require('../lighthouse-core/lib/asset-saver.js');

const cli = yargs
  .help('help')
  .version(() => require('../package').version)
  .showHelpOnFail(false, 'Specify --help for available options')

  .usage('$0 url')

  // List of options
  .group([
    'verbose',
    'quiet'
  ], 'Logging:')
  .describe({
    verbose: 'Displays verbose logging',
    quiet: 'Displays no progress or debug logs'
  })

  .group([
    'mobile',
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'config-path'
  ], 'Configuration:')
  .describe({
    'mobile': 'Emulates a Nexus 5X',
    'save-assets': 'Save the trace contents & screenshots to disk',
    'save-artifacts': 'Save all gathered artifacts to disk',
    'list-all-audits': 'Prints a list of all available audits and exits',
    'list-trace-categories': 'Prints a list of all required trace categories and exits',
    'config-path': 'The path to the config JSON.'
  })

  .group([
    'output',
    'output-path'
  ], 'Output:')
  .describe({
    'output': 'Reporter for the results',
    'output-path': `The file path to output the results
Example: --output-path=./lighthouse-results.html`
  })

  // boolean values
  .boolean([
    'save-assets',
    'save-artifacts',
    'list-all-audits',
    'list-trace-categories',
    'verbose',
    'quiet',
    'help'
  ])

  .choices('output', Object.values(Printer.OUTPUT_MODE))

  // default values
  .default('mobile', true)
  .default('output', Printer.OUTPUT_MODE.pretty)
  .default('output-path', 'stdout')
  .check(argv => {
    // Make sure lighthouse has been passed a url, or at least one of --list-all-audits
    // or --list-trace-categories. If not, stop the program and ask for a url
    if (!argv.listAllAudits && !argv.listTraceCategories && argv._.length === 0) {
      throw new Error('Please provide a url');
    }

    return true;
  })
  .argv;

if (cli.listAllAudits) {
  const audits = lighthouse
      .getAuditList()
      .map(i => {
        return i.replace(/\.js$/, '');
      });

  process.stdout.write(JSON.stringify({audits}));
  process.exit(0);
}

if (cli.listTraceCategories) {
  const traceCategories = lighthouse.traceCategories;

  process.stdout.write(JSON.stringify({traceCategories}));
  process.exit(0);
}

const urls = cli._;
const outputMode = cli.output;
const outputPath = cli['output-path'];
const flags = cli;

let config = null;
if (cli.configPath) {
  // Resolve the config file path relative to where cli was called.
  const configPath = path.resolve(process.cwd(), cli.configPath);
  config = require(configPath);
}

// set logging preferences
flags.logLevel = 'info';
if (cli.verbose) {
  flags.logLevel = 'verbose';
} else if (cli.quiet) {
  flags.logLevel = 'error';
}

function runLighthouse(addresses) {
  // Process URLs once at a time
  const address = addresses.shift();
  if (!address) {
    return;
  }

  lighthouse(address, flags, config)
    .then(results => Printer.write(results, outputMode, outputPath))
    .then(results => {
      if (outputMode !== 'html') {
        const filename = './' + assetSaver.getFilenamePrefix({url: address}) + '.html';
        Printer.write(results, 'html', filename);
      }
      runLighthouse(addresses);
      return;
    })
    .catch(err => {
      if (err.code === 'ECONNREFUSED') {
        console.error('Unable to connect to Chrome.');
        console.error('Please run Chrome w/ debugging port 9222 open:');
        console.error('    npm explore -g lighthouse -- npm run chrome');
      } else {
        console.error('Runtime error encountered:', err);
        console.error(err.stack);
      }
      process.exit(1);
    });
}

// kick off a lighthouse run
runLighthouse(urls);
