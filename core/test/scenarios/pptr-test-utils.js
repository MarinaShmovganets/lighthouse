/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import fs from 'fs';

import {before, beforeEach, after, afterEach} from 'mocha';
import * as puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {Server} from '../../../cli/test/fixtures/static-server.js';
import {LH_ROOT} from '../../../root.js';

/** @typedef {InstanceType<typeof import('../../../cli/test/fixtures/static-server.js').Server>} StaticServer */

/**
 * Some audits can be notApplicable based on machine timing information.
 * Exclude these audits from applicability comparisons.
 */
const FLAKY_AUDIT_IDS_APPLICABILITY = new Set([
  'long-tasks', // Depends on whether the longest task takes <50ms.
  'screenshot-thumbnails', // Depends on OS whether frames happen to be generated on non-visual timespan changes.
  'layout-shift-elements', // Depends on if the JS takes too long after input to be ignored for layout shift.
]);

const UNIT_OUTPUT_DIR = `${LH_ROOT}/.tmp/unit-failures`;

function createTestState() {
  /** @param {string} name @return {any} */
  const any = name => new Proxy({}, {get: () => {
    throw new Error(`${name} used without invoking \`state.before\``);
  }});

  /** @type {puppeteer.Browser} */
  let browser = any('browser');
  /** @type {puppeteer.Page} */
  let page = any('page');
  /** @type {StaticServer} */
  let server = any('server');
  /** @type {StaticServer} */
  let secondaryServer = any('server');
  let serverBaseUrl = '';
  let secondaryServerBaseUrl = '';

  return {
    browser,
    page,
    server,
    secondaryServer,
    serverBaseUrl,
    secondaryServerBaseUrl,

    /**
     * @param {number=} port
     * @param {number=} secondaryPort
     */
    installServerHooks(port = 10200, secondaryPort = 10503) {
      before(async () => {
        server = new Server(port);
        secondaryServer = new Server(secondaryPort);
        await server.listen(port, '127.0.0.1');
        await secondaryServer.listen(secondaryPort, '127.0.0.1');
        serverBaseUrl = `http://localhost:${this.server.getPort()}`;
        secondaryServerBaseUrl = `http://localhost:${this.secondaryServer.getPort()}`;
      });

      after(async () => {
        await server.close();
        await secondaryServer.close();
      });
    },

    installSetupAndTeardownHooks() {
      this.installServerHooks();

      before(async () => {
        browser = await puppeteer.launch({
          headless: true,
          executablePath: getChromePath(),
          ignoreDefaultArgs: ['--enable-automation'],
        });
      });

      beforeEach(async () => {
        page = await browser.newPage();
        await page.tracing.start();
      });

      afterEach(async function() {
        await page.close();
        const traceData = await page.tracing.stop();
        // eslint-disable-next-line no-invalid-this
        const currentTest = this.currentTest;
        if (currentTest?.state === 'failed' && traceData) {
          const testOutputDir = `${UNIT_OUTPUT_DIR}/${currentTest.fullTitle()}`;
          fs.mkdirSync(testOutputDir, {recursive: true});
          fs.writeFileSync(`${testOutputDir}/trace.json`, traceData);
        }
      });

      after(async () => {
        await browser.close();
      });
    },
  };
}

/**
 * @param {LH.Result} lhr
 */
function getAuditsBreakdown(lhr) {
  const auditResults = Object.values(lhr.audits);
  const irrelevantDisplayModes = new Set(['notApplicable', 'manual']);
  const applicableAudits = auditResults.filter(
    audit => !irrelevantDisplayModes.has(audit.scoreDisplayMode)
  );

  const notApplicableAudits = auditResults.filter(
    audit => (
      audit.scoreDisplayMode === 'notApplicable' &&
      !FLAKY_AUDIT_IDS_APPLICABILITY.has(audit.id)
    )
  );

  const informativeAudits = applicableAudits.filter(
    audit => audit.scoreDisplayMode === 'informative'
  );

  const erroredAudits = applicableAudits.filter(
    audit => audit.score === null && audit && !informativeAudits.includes(audit)
  );

  const failedAudits = applicableAudits.filter(audit => audit.score !== null && audit.score < 1);

  return {auditResults, erroredAudits, failedAudits, notApplicableAudits};
}

export {
  createTestState,
  getAuditsBreakdown,
};
