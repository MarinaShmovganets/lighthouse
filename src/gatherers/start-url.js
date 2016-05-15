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

/* global XMLHttpRequest, __returnResults, __startURL */

'use strict';

const Offline = require('./offline');

// *WARNING* do not use fetch.. due to it requiring window focus to fire.
// Request the current page by issuing a XMLHttpRequest request to ''
// and storing the status code on the window.
const requestStartURLPage = function() {
  const oReq = new XMLHttpRequest();
  oReq.onload = oReq.onerror = e => {
    // __returnResults is injected by driver.evaluateAsync
    __returnResults(e.currentTarget.status);
  };

  // __startURL is injected during afterReloadPageLoad
  oReq.open('GET', __startURL);
  oReq.send();
};

class StartURLOffline extends Offline {

  afterReloadPageLoad(options) {
    const driver = options.driver;

    if (typeof options.artifacts.manifest === 'undefined' ||
        typeof options.artifacts.manifest.value === 'undefined' ||
        typeof options.artifacts.manifest.value.start_url === 'undefined' ||
        typeof options.artifacts.manifest.value.start_url.value === 'undefined') {
      options.artifacts.startURLResponseCode = 0;
      return;
    }

    const startURL = options.artifacts.manifest.value.start_url.value;
    const cmd = `__startURL = "${startURL}";(${requestStartURLPage.toString()}())`;

    // TODO eventually we will want to walk all network
    // requests that the page initially made and retry them.
    return StartURLOffline
        .goOffline(driver)
        .then(_ => driver.evaluateAsync(cmd))
        .then(startURLResponseCode => {
          options.artifacts.startURLResponseCode = startURLResponseCode;
        })
        .then(_ => Offline.goOnline(driver));
  }
}

module.exports = StartURLOffline;
