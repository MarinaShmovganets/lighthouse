/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
  * @fileoverview Gathers all videos used on the page with their size 
  * information. Executes script in the context of the page.
  */
'use strict';

const Gatherer = require('./gatherer');
const DOMHelpers = require('../../lib/dom-helpers.js');

/* global window, getElementsInDocument */

/* istanbul ignore next */
function collectVideoElementInfo() {
  const allElements = getElementsInDocument();
  const allVideoElements = allElements.filter(element => element.localName === 'video');
  
  return allVideoElements.map(element => {
    return {
      src: element.currentSrc,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      videoHeight: element.videoHeight,
      videoWidth: element.videoWidth,
    }
  });
}

class VideoUsage extends Gatherer {
  /**
   * @param {{driver: !Object}} options Run options
   * @return {!Promise<!Array<!Object>>>} The information collected for each video
   */
  afterPass(options, traceData) {
    const driver = options.driver;

    const expression = `(function() {
      ${DOMHelpers.getElementsInDocumentFnString}; // define function on page
      return (${collectVideoElementInfo.toString()})();
    })()`;

    return driver.evaluateAsync(expression);
  }
}

module.exports = VideoUsage;
