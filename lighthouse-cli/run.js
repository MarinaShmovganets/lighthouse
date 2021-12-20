/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

import path from 'path';

import psList from 'ps-list';
import * as ChromeLauncher from 'chrome-launcher';
import yargsParser from 'yargs-parser';
import log from 'lighthouse-logger';
import open from 'open';

import * as Printer from './printer.js';
import lighthouse from '../lighthouse-core/index.js';
import {getLhrFilenamePrefix} from '../report/generator/file-namer.js';
import * as assetSaver from '../lighthouse-core/lib/asset-saver.js';
import URL from '../lighthouse-core/lib/url-shim.js';

/** @typedef {Error & {code: string, friendlyMessage?: string}} ExitError */

const _RUNTIME_ERROR_CODE = 1;
const _PROTOCOL_TIMEOUT_EXIT_CODE = 67;

/**
 * exported for testing
 * @param {string|Array<string>} flags
 * @return {Array<string>}
 */
function parseChromeFlags(flags = '') {
  // flags will be a string if there is only one chrome-flag parameter:
  // i.e. `lighthouse --chrome-flags="--user-agent='My Agent' --headless"`
  // flags will be an array if there are multiple chrome-flags parameters
  // i.e. `lighthouse --chrome-flags="--user-agent='My Agent'" --chrome-flags="--headless"`
  const trimmedFlags = (Array.isArray(flags) ? flags : [flags])
      // `child_process.execFile` and other programmatic invocations will pass Lighthouse arguments atomically.
      // Many developers aren't aware of this and attempt to pass arguments to LH as they would to a shell `--chromeFlags="--headless --no-sandbox"`.
      // In this case, yargs will see `"--headless --no-sandbox"` and treat it as a single argument instead of the intended `--headless --no-sandbox`.
      // We remove quotes that surround the entire expression to make this work.
      // i.e. `child_process.execFile("lighthouse", ["http://google.com", "--chrome-flags='--headless --no-sandbox'")`
      // the following regular expression removes those wrapping quotes:
      .map((flagsGroup) => flagsGroup.replace(/^\s*('|")(.+)\1\s*$/, '$2').trim())
      .join(' ').trim();

  const parsed = yargsParser(trimmedFlags, {
    configuration: {'camel-case-expansion': false, 'boolean-negation': false},
  });

  return Object
      .keys(parsed)
      // Remove unnecessary _ item provided by yargs,
      .filter(key => key !== '_')
      // Avoid '=true', then reintroduce quotes
      .map(key => {
        if (parsed[key] === true) return `--${key}`;
        // ChromeLauncher passes flags to Chrome as atomic arguments, so do not double quote
        // i.e. `lighthouse --chrome-flags="--user-agent='My Agent'"` becomes `chrome "--user-agent=My Agent"`
        // see https://github.com/GoogleChrome/lighthouse/issues/3744
        return `--${key}=${parsed[key]}`;
      });
}

/**
 * Attempts to connect to an instance of Chrome with an open remote-debugging
 * port. If none is found, launches a debuggable instance.
 * @param {LH.CliFlags} flags
 * @return {Promise<ChromeLauncher.LaunchedChrome>}
 */
function getDebuggableChrome(flags) {
  return ChromeLauncher.launch({
    port: flags.port,
    ignoreDefaultFlags: flags.chromeIgnoreDefaultFlags,
    chromeFlags: parseChromeFlags(flags.chromeFlags),
    logLevel: flags.logLevel,
  });
}

/** @return {never} */
function printConnectionErrorAndExit() {
  console.error('Unable to connect to Chrome');
  return process.exit(_RUNTIME_ERROR_CODE);
}

/** @return {never} */
function printProtocolTimeoutErrorAndExit() {
  console.error('Debugger protocol timed out while connecting to Chrome.');
  return process.exit(_PROTOCOL_TIMEOUT_EXIT_CODE);
}

/**
 * @param {ExitError} err
 * @return {never}
 */
function printRuntimeErrorAndExit(err) {
  console.error('Runtime error encountered:', err.friendlyMessage || err.message);
  if (err.stack) {
    console.error(err.stack);
  }
  return process.exit(_RUNTIME_ERROR_CODE);
}

/**
 * @param {ExitError} err
 * @return {never}
 */
function printErrorAndExit(err) {
  if (err.code === 'ECONNREFUSED') {
    return printConnectionErrorAndExit();
  } else if (err.code === 'CRI_TIMEOUT') {
    return printProtocolTimeoutErrorAndExit();
  } else {
    return printRuntimeErrorAndExit(err);
  }
}

/**
 * @param {LH.RunnerResult} runnerResult
 * @param {LH.CliFlags} flags
 * @return {Promise<void>}
 */
async function saveResults(runnerResult, flags) {
  const cwd = process.cwd();

  if (flags.lanternDataOutputPath) {
    const devtoolsLog = runnerResult.artifacts.devtoolsLogs.defaultPass;
    await assetSaver.saveLanternNetworkData(devtoolsLog, flags.lanternDataOutputPath);
  }

  const shouldSaveResults = flags.auditMode || (flags.gatherMode === flags.auditMode);
  if (!shouldSaveResults) return;
  const {lhr, artifacts, report} = runnerResult;

  // Use the output path as the prefix for all generated files.
  // If no output path is set, generate a file prefix using the URL and date.
  const configuredPath = !flags.outputPath || flags.outputPath === 'stdout' ?
      getLhrFilenamePrefix(lhr) :
      flags.outputPath.replace(/\.\w{2,4}$/, '');
  const resolvedPath = path.resolve(cwd, configuredPath);

  if (flags.saveAssets) {
    await assetSaver.saveAssets(artifacts, lhr.audits, resolvedPath);
  }

  for (const outputType of flags.output) {
    const extension = outputType;
    const output = report[flags.output.indexOf(outputType)];
    let outputPath = `${resolvedPath}.report.${extension}`;
    // If there was only a single output and the user specified an outputPath, force usage of it.
    if (flags.outputPath && flags.output.length === 1) outputPath = flags.outputPath;
    await Printer.write(output, outputType, outputPath);

    if (outputType === Printer.OutputMode[Printer.OutputMode.html]) {
      if (flags.view) {
        open(outputPath, {wait: false});
      } else {
        // eslint-disable-next-line max-len
        log.log('CLI', 'Protip: Run lighthouse with `--view` to immediately open the HTML report in your browser');
      }
    }
  }
}

/**
 * Attempt to kill the launched Chrome, if defined.
 * @param {ChromeLauncher.LaunchedChrome=} launchedChrome
 * @return {Promise<void>}
 */
async function potentiallyKillChrome(launchedChrome) {
  if (!launchedChrome) return;

  /** @type {NodeJS.Timeout} */
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(reject, 5000, new Error('Timed out waiting to kill Chrome'));
  });

  return Promise.race([
    launchedChrome.kill(),
    timeoutPromise,
  ]).catch(async err => {
    const runningProcesses = await psList();
    if (!runningProcesses.some(proc => proc.pid === launchedChrome.pid)) {
      log.warn('CLI', 'Warning: Chrome process could not be killed because it already exited.');
      return;
    }

    throw new Error(`Couldn't quit Chrome process. ${err}`);
  }).finally(() => {
    clearTimeout(timeout);
  });
}

/**
 * @param {string} url
 * @param {LH.CliFlags} flags
 * @param {LH.Config.Json|undefined} config
 * @param {ChromeLauncher.LaunchedChrome} launchedChrome
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function runLighthouseWithFraggleRock(url, flags, config, launchedChrome) {
  const fraggleRock = (await import('../lighthouse-core/fraggle-rock/api.js')).default;
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.connect({browserURL: `http://localhost:${launchedChrome.port}`});
  const page = await browser.newPage();
  flags.channel = 'fraggle-rock-cli';
  const configContext = {configPath: flags.configPath, settingsOverrides: flags};
  return fraggleRock.navigation({url, page, config, configContext});
}

/**
 * @param {string} url
 * @param {LH.CliFlags} flags
 * @param {LH.Config.Json|undefined} config
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function runLighthouse(url, flags, config) {
  /** @param {any} reason */
  async function handleTheUnhandled(reason) {
    process.stderr.write(`Unhandled Rejection. Reason: ${reason}\n`);
    await potentiallyKillChrome(launchedChrome).catch(() => {});
    setTimeout(_ => {
      process.exit(1);
    }, 100);
  }
  process.on('unhandledRejection', handleTheUnhandled);

  /** @type {ChromeLauncher.LaunchedChrome|undefined} */
  let launchedChrome;

  try {
    if (url && flags.auditMode) {
      log.warn('CLI', 'URL parameter is ignored when using -A flag');
    }

    const shouldGather = flags.gatherMode || flags.gatherMode === flags.auditMode;
    const shouldUseLocalChrome = URL.isLikeLocalhost(flags.hostname);
    if (shouldGather && shouldUseLocalChrome) {
      launchedChrome = await getDebuggableChrome(flags);
      flags.port = launchedChrome.port;
    }

    const runnerResult = flags.fraggleRock && launchedChrome ?
       await runLighthouseWithFraggleRock(url, flags, config, launchedChrome) :
       await lighthouse(url, flags, config);

    // If in gatherMode only, there will be no runnerResult.
    if (runnerResult) {
      await saveResults(runnerResult, flags);
    }

    await potentiallyKillChrome(launchedChrome);
    process.removeListener('unhandledRejection', handleTheUnhandled);

    // Runtime errors indicate something was *very* wrong with the page result.
    // We don't want the user to have to parse the report to figure it out, so we'll still exit
    // with an error code after we saved the results.
    if (runnerResult?.lhr.runtimeError) {
      const {runtimeError} = runnerResult.lhr;
      return printErrorAndExit({
        name: 'LHError',
        friendlyMessage: runtimeError.message,
        code: runtimeError.code,
        message: runtimeError.message,
      });
    }

    return runnerResult;
  } catch (err) {
    await potentiallyKillChrome(launchedChrome).catch(() => {});
    return printErrorAndExit(err);
  }
}

export {
  parseChromeFlags,
  saveResults,
  runLighthouse,
};
