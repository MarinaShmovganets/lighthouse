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
 * @fileoverview Tests whether the page is using console.time().
 */

/* global window, __returnResults */

'use strict';

const Driver = require('../../drivers/driver.js');
const Gatherer = require('../gatherer');

function collectUsage() {
  __returnResults(Array.from(
      window.__consoleTimeStackTraces).map(item => JSON.parse(item)));
}

class ConsoleTimeUsage extends Gatherer {

  beforePass(options) {
    const driver = options.driver;
    return driver.evaluateScriptOnLoad(`
        window.__consoleTimeStackTraces = new Set();
        (console.time = function ${Driver.captureAPIUsage.toString()}(
            console.time, window.__consoleTimeStackTraces))`);
  }

  afterPass(options) {
    return options.driver.evaluateAsync(`(${collectUsage.toString()}())`)
        .then(consoleTimeUsage => {
          this.artifact.usage = consoleTimeUsage;
        }, _ => {
          this.artifact = -1;
          return;
        });
  }
}

module.exports = ConsoleTimeUsage;
