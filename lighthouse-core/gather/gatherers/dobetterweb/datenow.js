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

/**
 * @fileoverview Tests whether the page is using Date.now().
 */

/* global window, __returnResults */

'use strict';

const Driver = require('../../drivers/driver.js');
const Gatherer = require('../gatherer');

function collectUsage() {
  __returnResults(Array.from(
      window.__dateNowStackTraces).map(item => JSON.parse(item)));
}

class DateNowUse extends Gatherer {

  beforePass(options) {
    const driver = options.driver;
    return driver.evaluateScriptOnLoad(`
        window.__dateNowStackTraces = new Set();
        (Date.now = function ${Driver.captureAPIUsage.toString()}(
            Date.now, window.__dateNowStackTraces))`);
  }

  afterPass(options) {
    return options.driver.evaluateAsync(`(${collectUsage.toString()}())`)
        .then(dateNowUses => {
          this.artifact.usage = dateNowUses;
        }, _ => {
          this.artifact = -1;
          return;
        });
  }
}

module.exports = DateNowUse;
