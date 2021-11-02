/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview This file exercises two LH reports within the same DOM. */

/** @typedef {import('../clients/bundle.js')} lighthouseRenderer */

/** @type {lighthouseRenderer} */
// @ts-expect-error
const lighthouseRenderer = window['report'];

(async function __initPsiReports__() {
  // @ts-expect-error
  const mobileLHR = window.__LIGHTHOUSE_JSON__;
  const desktopLHR = JSON.parse(JSON.stringify(mobileLHR));

  const lhrs = {
    'mobile': mobileLHR,
    'desktop': desktopLHR,
  };

  for (const [tabId, lhr] of Object.entries(lhrs)) {
    await distinguishLHR(lhr, tabId);

    const container = document.querySelector(`#${tabId} main`);
    if (!container) throw new Error('Unexpected DOM. Bailing.');

    renderLHReport(lhr, container);
  }
})();

/**
 * @param {LH.Result} lhrData
 * @param {HTMLElement} reportContainer
 */
function renderLHReport(lhrData, reportContainer) {
  /**
   * @param {Document} doc
   */
  function getRenderer(doc) {
    const dom = new lighthouseRenderer.DOM(doc);
    return new lighthouseRenderer.ReportRenderer(dom);
  }

  const renderer = getRenderer(reportContainer.ownerDocument);
  reportContainer.classList.add('lh-root', 'lh-vars');

  try {
    renderer.renderReport(lhrData, reportContainer);
    // TODO: handle topbar removal better
    // TODO: display warnings if appropriate.
    for (const el of reportContainer.querySelectorAll('.lh-topbar, .lh-warnings')) {
      el.setAttribute('hidden', 'true');
    }
    const features = new lighthouseRenderer.ReportUIFeatures(renderer._dom);
    features.initFeatures(lhrData);
  } catch (e) {
    console.error(e);
    reportContainer.textContent = 'Error: LHR failed to render.';
  }
}


/**
 * Tweak the LHR to make the desktop and mobile reports easier to identify.
 * Adjusted: Perf category name and score, and emoji placed on top of key screenshots.
 * @param {LH.Result} lhr
 * @param {string} tabId
 */
async function distinguishLHR(lhr, tabId) {
  lhr.categories.performance.title += ` ${tabId}`; // for easier identification
  if (tabId === 'desktop') {
    lhr.categories.performance.score = 0.81;
  }

  const finalSSDetails = lhr.audits['final-screenshot'] && lhr.audits['final-screenshot'].details;
  if (!finalSSDetails || finalSSDetails.type !== 'screenshot') throw new Error();
  finalSSDetails.data = await decorateScreenshot(finalSSDetails.data, tabId);

  const fpSSDetails = lhr.audits['full-page-screenshot'] &&
      lhr.audits['full-page-screenshot'].details;
  if (!fpSSDetails || fpSSDetails.type !== 'full-page-screenshot') throw new Error();
  fpSSDetails.screenshot.data = await decorateScreenshot(fpSSDetails.screenshot.data, tabId);
}

/**
 * Add 📱 and 💻 emoji on top of screenshot
 * @param {string} datauri
 * @param {string} tabId
 */
async function decorateScreenshot(datauri, tabId) {
  const img = document.createElement('img');

  await new Promise((resolve, reject) => {
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.src = datauri;
  });
  const c = document.createElement('canvas');
  c.width = tabId === 'desktop' ? 280 : img.width;
  c.height = tabId === 'desktop' ? 194 : img.height;

  const ctx = c.getContext('2d');
  if (!ctx) throw new Error();
  ctx.drawImage(img, 0, 0, c.width, c.height);
  ctx.font = `${c.width / 2}px serif`;
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  ctx.fillText(tabId === 'mobile' ? '📱' : '💻', c.width / 2, Math.min(c.height / 2, 700));
  return c.toDataURL();
}
