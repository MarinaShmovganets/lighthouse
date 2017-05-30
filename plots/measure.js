/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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

/* eslint-disable no-console */

const path = require('path');
const parseURL = require('url').parse;

const mkdirp = require('mkdirp');
const args = require('yargs')
  .wrap(Math.min(process.stdout.columns, 120))
  .help('help')
  .usage('node measure.js [options]')
  .example('node $0 -n 3 --sites-path ./sample-sites.json')
  .example('node $0 --site https://google.com/')
  .example('node $0 --subset')
  .describe({
    'n': 'Number of runs to do per site',
    'reuse-chrome': 'Reuse the same Chrome instance across all site runs',
    'keep-first-run': 'By default if you use --reuse-chrome, the first run results are discarded',
  })
  .group(
    ['disable-device-emulation', 'disable-cpu-throttling', 'disable-network-throttling'],
    'Chrome DevTools settings:')
  .describe({
    'disable-device-emulation': 'Disable Nexus 5X emulation',
    'disable-cpu-throttling': 'Disable CPU throttling',
    'disable-network-throttling': 'Disable network throttling',
  })
  .group(['sites-path', 'subset', 'site'], 'Options to specify sites:')
  .describe({
    'sites-path': 'Include relative path of a json file with urls to run',
    'subset': 'Measure a subset of popular sites',
    'site': 'Include a specific site url to run',
  })
  .boolean(['disable-device-emulation', 'disable-cpu-throttling', 'disable-network-throttling'])
  .argv;

const constants = require('./constants.js');
const utils = require('./utils.js');
const config = require('../lighthouse-core/config/plots.json');
const lighthouse = require('../lighthouse-core/index.js');
const ChromeLauncher = require('../chrome-launcher/chrome-launcher.js');
const Printer = require('../lighthouse-cli/printer');
const assetSaver = require('../lighthouse-core/lib/asset-saver.js');

const keepFirstRun = args['keep-first-run'] || !args['reuse-chrome'];
const numberOfRuns = args['n'] || 3;

const SITES = [
  // Flagship sites
  'https://nytimes.com',
  'https://flipkart.com',
  'http://www.espn.com/',
  'https://www.washingtonpost.com/pwa/',

  // TTI Tester sites
  'https://housing.com/in/buy/real-estate-hyderabad',
  'http://www.npr.org/',
  'http://www.vevo.com/',
  'https://weather.com/',
  'https://www.nasa.gov/',
  'https://vine.co/',
  'http://www.booking.com/',
  'http://www.thestar.com.my',
  'http://www.58pic.com',
  'http://www.dawn.com/',
  'https://www.ebs.in/IPS/',

  // Sourced from: https://en.wikipedia.org/wiki/List_of_most_popular_websites
  // (http://www.alexa.com/topsites)
  // Removed adult websites and duplicates (e.g. google int'l websites)
  // Also removed sites that don't have significant index pages:
  // "t.co", "popads.net", "onclickads.net", "microsoftonline.com", "onclckds.com", "cnzz.com",
  // "live.com", "adf.ly", "googleusercontent.com",
  'https://www.google.com/search?q=flowers',
  'https://youtube.com',
  'https://facebook.com',
  'https://baidu.com',
  'https://en.wikipedia.org/wiki/Google',
  'https://yahoo.com',
  'https://amazon.com',
  'http://www.qq.com/',
  'https://taobao.com',
  'https://vk.com',
  'https://mobile.twitter.com/ChromeDevTools',
  'https://www.instagram.com/stephencurry30',
  'http://www.hao123.cn/',
  'http://www.sohu.com/',
  'https://sina.com.cn',
  'https://reddit.com',
  'https://linkedin.com',
  'https://tmall.com',
  'https://weibo.com',
  'https://360.cn',
  'https://yandex.ru',
  'https://ebay.com',
  'https://bing.com',
  'https://msn.com',
  'https://www.sogou.com/',
  'https://wordpress.com',
  'https://microsoft.com',
  'https://tumblr.com',
  'https://aliexpress.com',
  'https://blogspot.com',
  'https://netflix.com',
  'https://ok.ru',
  'https://stackoverflow.com',
  'https://imgur.com',
  'https://apple.com',
  'http://www.naver.com/',
  'https://mail.ru',
  'http://www.imdb.com/',
  'https://office.com',
  'https://github.com',
  'https://pinterest.com',
  'https://paypal.com',
  'http://www.tianya.cn/',
  'https://diply.com',
  'https://twitch.tv',
  'https://adobe.com',
  'https://wikia.com',
  'https://coccoc.com',
  'https://so.com',
  'https://fc2.com',
  'https://www.pixnet.net/',
  'https://dropbox.com',
  'https://zhihu.com',
  'https://whatsapp.com',
  'https://alibaba.com',
  'https://ask.com',
  'https://bbc.com'
];

function getUrls() {
  if (args['sites-path']) {
    return require(path.resolve(__dirname, args['sites-path']));
  }

  if (args['site']) {
    return [args['site']];
  }

  if (args['subset']) {
    return [
      'https://en.wikipedia.org/wiki/Google',
      'https://mobile.twitter.com/ChromeDevTools',
      'https://www.instagram.com/stephencurry30',
      'https://amazon.com',
      'https://nytimes.com',
      'https://www.google.com/search?q=flowers',

      'https://flipkart.com',
      'http://www.espn.com/',
      'https://www.washingtonpost.com/pwa/',
      'http://www.npr.org/',
      'http://www.booking.com/',
      'https://youtube.com',
      'https://reddit.com',
      'https://ebay.com',
      'https://stackoverflow.com',
      'https://apple.com',

      // Could not run nasa on gin3g
      'https://www.nasa.gov/',
    ];
  }

  return SITES;
}

const URLS = getUrls();

function main() {
  if (numberOfRuns === 1 && !keepFirstRun) {
    console.log('ERROR: You are only doing one run and re-using chrome, but did not specify --keep-first-run');
    return;
  }

  if (utils.isDir(constants.OUT_PATH)) {
    console.log('ERROR: Found output from previous run at: ', constants.OUT_PATH);
    console.log('Please run: npm run clean');
    return;
  }

  if (args['reuse-chrome']) {
    ChromeLauncher.launch().then(launcher => {
      return runAnalysisWithExistingChromeInstances(launcher)
        .catch(err => console.error(err))
        .then(() => launcher.kill());
    });
    return;
  }
  runAnalysisWithNewChromeInstances();
}

main();

/**
 * Launches a new Chrome instance for each site run.
 * Returns a promise chain that analyzes all the sites n times.
 * @return {!Promise}
 */
function runAnalysisWithNewChromeInstances() {
  let promise = Promise.resolve();

  for (let i = 0; i < numberOfRuns; i++) {
    // Averages out any order-dependent effects such as memory pressure
    utils.shuffle(URLS);

    const id = i.toString();
    const isFirstRun = i === 0;
    const ignoreRun = keepFirstRun ? false : isFirstRun;
    for (const url of URLS) {
      promise = promise.then(() => {
        return ChromeLauncher.launch().then(launcher => {
          return singleRunAnalysis(url, id, launcher, {ignoreRun})
            .catch(err => console.error(err))
            .then(() => launcher.kill());
        })
        .catch(err => console.error(err));
      });
    }
  }
  return promise;
}

/**
 * Reuses existing Chrome instance for all site runs.
 * Returns a promise chain that analyzes all the sites n times.
 * @param {!Launcher} launcher
 * @return {!Promise}
 */
function runAnalysisWithExistingChromeInstances(launcher) {
  let promise = Promise.resolve();

  for (let i = 0; i < numberOfRuns; i++) {
    // Averages out any order-dependent effects such as memory pressure
    utils.shuffle(URLS);

    const id = i.toString();
    const isFirstRun = i === 0;
    const ignoreRun = keepFirstRun ? false : isFirstRun;
    for (const url of URLS) {
      promise = promise.then(() => singleRunAnalysis(url, id, launcher, {ignoreRun}));
    }
  }
  return promise;
}

/**
 * Analyzes a site a single time using lighthouse.
 * @param {string} url
 * @param {string} id
 * @param {!Launcher} launcher
 * @param {{ignoreRun: boolean}} options
 * @return {!Promise}
 */
function singleRunAnalysis(url, id, launcher, {ignoreRun}) {
  console.log('Measuring site:', url, 'run:', id);
  const parsedURL = parseURL(url);
  const urlBasedFilename = sanitizeURL(`${parsedURL.host}-${parsedURL.pathname}`);
  const runPath = path.resolve(constants.OUT_PATH, urlBasedFilename, id);
  if (!ignoreRun) {
    mkdirp.sync(runPath);
  }
  const outputPath = path.resolve(runPath, constants.LIGHTHOUSE_RESULTS_FILENAME);
  const assetsPath = path.resolve(runPath, 'assets');
  return analyzeWithLighthouse(launcher, url, outputPath, assetsPath, {ignoreRun});
}

/**
 * Runs lighthouse and save the artifacts (not used directly by plots,
 * but may be helpful for debugging outlier runs).
 * @param {!Launcher} launcher
 * @param {string} url
 * @param {string} outputPath
 * @param {string} assetsPath
 * @param {{ignoreRun: boolean}} options
 * @return {!Promise}
 */
function analyzeWithLighthouse(launcher, url, outputPath, assetsPath, {ignoreRun}) {
  const flags = {
    output: 'json',
    disableCpuThrottling: args['disable-cpu-throttling'],
    disableNetworkThrottling: args['disable-network-throttling'],
    disableDeviceEmulation: args['disable-device-emulation'],
    port: launcher.port,
  };
  return lighthouse(url, flags, config)
    .then(lighthouseResults => {
      if (ignoreRun) {
        console.log('First load of site. Results not being saved to disk.');
        return;
      }
      return assetSaver
        .saveAssets(lighthouseResults.artifacts, lighthouseResults.audits, assetsPath)
        .then(() => {
          lighthouseResults.artifacts = undefined;
          return Printer.write(lighthouseResults, flags.output, outputPath);
        });
    })
    .catch(err => console.error(err));
}

/**
 * Converts a URL into a filename-friendly string
 * @param {string} string
 * @return {string}
 */
function sanitizeURL(string) {
  const illegalRe = /[\/\?<>\\:\*\|":]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g; // eslint-disable-line no-control-regex
  const reservedRe = /^\.+$/;

  return string
    .replace(illegalRe, '.')
    .replace(controlRe, '\u2022')
    .replace(reservedRe, '')
    .replace(/\s+/g, '_');
}
