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

/* global document */

const Gatherer = require('../gatherer');

function getExternalAnchorsWithNoRelNoOpener() {
  return new Promise((resolve, reject) => {
    const failingNodeList =
      [...document.querySelectorAll('a[target="_blank"]:not([rel="noopener"])')]
      .map(node => node.href);
    resolve(failingNodeList);
  });
}

class ExternalAnchorsWithNoRelNoopener extends Gatherer {

  afterPass(options) {
    const driver = options.driver;
    const scriptStr = `(${getExternalAnchorsWithNoRelNoOpener.toString()}())`;
    return driver.evaluateAsync(scriptStr)
      .then(failingNodeList => {
        this.artifact.usages = failingNodeList;
      })
      .catch(_ => {
        this.artifact = -1;
      });
  }
}

module.exports = ExternalAnchorsWithNoRelNoopener;
