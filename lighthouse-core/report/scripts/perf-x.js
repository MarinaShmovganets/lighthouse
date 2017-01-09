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

/* global window, document */

'use strict';

/**
 * @fileoverview Report script for Project Performance Experiment.
 *
 * Include functions for supporting interation between report page and Perf-X server.
 */

window.addEventListener('DOMContentLoaded', _ => {
  const rerunButton = document.querySelector('.js-rerun-button');
  rerunButton.style.display = 'inline-block';

  const rerunPopup = document.querySelector('.js-rerun-popup');
  rerunButton.addEventListener('click', () => {
    rerunPopup.setAttribute('status', 'running');
    rerunLighthouse().then(() => {
      rerunPopup.setAttribute('status', 'complete');
    });
  });

  const rerunReportLink = document.querySelector('.js-rerun-report-link');
  rerunReportLink.addEventListener('click', () => {
    rerunPopup.setAttribute('status', 'idle');
  });
});

/**
 * Send request to rerun lighthouse with additional cli-flags.
 * The following cli-flags will be ignored.
 *	- Flags which are not applicable to rerun performance evaluation (e.g. --list-all-audits)
 *	- config related flags (e.g. --config-path). Always use perf-olny config for rerunning.
 *
 * @param {!Object} additionalFlags
 * @return {!Promise}
 */
function rerunLighthouse(additionalFlags={}) {
  return fetch('/rerun', {method: 'POST', body: JSON.stringify(additionalFlags)});
}
