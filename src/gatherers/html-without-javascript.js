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

/* Note that this returns the outerHTML of the <body> element, not the documentElement. */

const HTML = require('./html');

class HTMLWithoutJavaScript extends HTML {
  get name() {
    return 'htmlWithoutJavaScript';
  }

  afterThirdReloadPageLoad(options) {
    const driver = options.driver;

    this.artifact = {};
    return driver.sendCommand('DOM.getDocument')
        .then(result => result.root.nodeId)
        .then(nodeId => driver.sendCommand('DOM.querySelector', {
          nodeId: nodeId,
          selector: 'body'
        }))
        .then(result => result.nodeId)
        .then(nodeId => driver.sendCommand('DOM.getOuterHTML', {
          nodeId: nodeId
        }))
        .then(nodeHTML => {
          this.artifact.html = nodeHTML.outerHTML;
        })
        .then(_ => driver.sendCommand('Runtime.evaluate', {
          // note: we use innerText, not textContent, because textContent includes the content of <script> elements!
          expression: 'document.querySelector("body") ? ' +
            'document.querySelector("body").innerText : ""'
        }))
        .then(result => {
          this.artifact.text = result.result.value;
        })
        .catch(_ => {
          this.artifact = {
            value: -1,
            debugString: 'Unable to get document body HTML'
          };
        });
  }
}

module.exports = HTMLWithoutJavaScript;
