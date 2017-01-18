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

/**
 * Error strings that indicate a problem in how Lighthouse was run, not in
 * Lighthouse itself, mapped to more useful strings to report to the user.
 */
const NON_BUG_ERROR_MESSAGES = {
  'Another debugger': 'You probably have DevTools open. Close DevTools to use Lighthouse',
  'multiple tabs': 'You probably have multiple tabs open to the same origin. ' +
      'Close the other tabs to use Lighthouse.',
  // The extension debugger API is forbidden from attaching to the web store.
  // @see https://chromium.googlesource.com/chromium/src/+/5d1f214db0f7996f3c17cd87093d439ce4c7f8f1/chrome/common/extensions/chrome_extensions_client.cc#232
  'The extensions gallery cannot be scripted': 'The Lighthouse extension cannot audit the ' +
      'Chrome Web Store. If necessary, use the Lighthouse CLI to do so.',
  // The user tries to review an error page or has network issues
  'Unable to load the page': 'Unable to load the page. Please verify the url you ' +
      'are trying to review.'
};

const subpageVisibleClass = 'subpage--visible';

const getBackgroundPage = new Promise((resolve, reject) => {
  chrome.runtime.getBackgroundPage(resolve);
});

let siteURL = null;
let statusEl = null;

function getLighthouseVersion() {
  return chrome.runtime.getManifest().version;
}

function getChromeVersion() {
  return /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
}

function startSpinner() {
  statusEl.classList.add(subpageVisibleClass);
}

function stopSpinner() {
  statusEl.classList.remove(subpageVisibleClass);
}

function buildReportErrorLink(err) {
  const MAX_ISSUE_ERROR_LENGTH = 60;

  let qsBody = '**Lighthouse Version**: ' + getLighthouseVersion() + '\n';
  qsBody += '**Chrome Version**: ' + getChromeVersion() + '\n';

  if (siteURL) {
    qsBody += '**URL**: ' + siteURL + '\n';
  }

  qsBody += '**Error Message**: ' + err.message + '\n';
  qsBody += '**Stack Trace**:\n ```' + err.stack + '```';

  const base = 'https://github.com/googlechrome/lighthouse/issues/new?';
  let titleError = err.message;

  if (titleError.length > MAX_ISSUE_ERROR_LENGTH) {
    titleError = `${titleError.substring(0, MAX_ISSUE_ERROR_LENGTH - 3)}...`;
  }
  const title = encodeURI('title=Extension Error: ' + titleError);
  const body = '&body=' + encodeURI(qsBody);

  const reportErrorEl = document.createElement('a');
  reportErrorEl.className = 'button button--report-error';
  reportErrorEl.href = base + title + body;
  reportErrorEl.textContent = 'Report Error';
  reportErrorEl.target = '_blank';

  return reportErrorEl;
}

function logstatus([, message, details]) {
  document.querySelector('.status__msg').textContent = message;
  const statusDetailsMessageEl = document.querySelector('.status__detailsmsg');
  statusDetailsMessageEl.textContent = details;
}

function createOptionItem(text, isChecked) {
  const input = document.createElement('input');
  input.setAttribute('type', 'checkbox');
  input.setAttribute('value', text);
  if (isChecked) {
    input.setAttribute('checked', 'checked');
  }

  const label = document.createElement('label');
  label.appendChild(input);
  label.appendChild(document.createTextNode(text));
  const listItem = document.createElement('li');
  listItem.appendChild(label);

  return listItem;
}

function onGenerateReportButtonClick() {
  startSpinner();

  const feedbackEl = document.querySelector('.feedback');
  feedbackEl.textContent = '';

  getBackgroundPage.then(background => {
    background.loadSelectedAggregations().then(selectedAggregations => {
      return background.runLighthouseInExtension({
        flags: {
          disableCpuThrottling: true
        },
        restoreCleanState: true
      }, selectedAggregations);
    }).catch(err => {
      let message = err.message;
      let includeReportLink = true;

      // Check for errors in how the user ran Lighthouse and replace with a more
      // helpful message (and remove 'Report Error' link).
      for (const [test, replacement] of Object.entries(NON_BUG_ERROR_MESSAGES)) {
        if (message.includes(test)) {
          message = replacement;
          includeReportLink = false;
          break;
        }
      }

      feedbackEl.textContent = message;

      if (includeReportLink) {
        feedbackEl.className = 'feedback-error';
        feedbackEl.appendChild(buildReportErrorLink(err));
      }

      stopSpinner();
      background.console.error(err);
    });
  });
}

document.addEventListener('DOMContentLoaded', _ => {
  getBackgroundPage.then(background => {
    statusEl = document.querySelector('.status');

    /**
     * Generates a document fragment containing a list of checkboxes and labels
     * for the aggregation categories.
     * @param {!Object<boolean>} selectedAggregations
     * @return {!DocumentFragment}
     */
    function generateOptionsList(list, selectedAggregations) {
      const frag = document.createDocumentFragment();

      const defaultAggregations = background.getDefaultAggregations();
      defaultAggregations.forEach(aggregation => {
        const isChecked = selectedAggregations[aggregation.name];
        frag.appendChild(createOptionItem(aggregation.name, isChecked));
      });

      return frag;
    }

    if (background.isRunning()) {
      startSpinner();
    }

    const optionsList = document.querySelector('.options__list');

    background.listenForStatus(logstatus);
    background.loadSelectedAggregations().then(aggregations => {
      const frag = generateOptionsList(optionsList, aggregations);
      optionsList.appendChild(frag);
    });

    const generateReportEl = document.getElementById('generate-report');
    generateReportEl.addEventListener('click', onGenerateReportButtonClick);

    const generateOptionsEl = document.getElementById('configure-options');
    const optionsEl = document.querySelector('.options');
    generateOptionsEl.addEventListener('click', () => {
      optionsEl.classList.add(subpageVisibleClass);
    });

    const okButton = document.getElementById('ok');
    okButton.addEventListener('click', () => {
      // Save selected aggregation categories on options page close.
      const checkedAggregations = Array.from(optionsEl.querySelectorAll(':checked'))
          .map(input => input.value);
      background.saveSelectedAggregations(checkedAggregations);

      optionsEl.classList.remove(subpageVisibleClass);
    });

    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        return;
      }

      siteURL = new URL(tabs[0].url);

      document.querySelector('header h2').textContent = siteURL.origin;
    });
  });
});
