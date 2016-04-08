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

const Gather = require('./gather');

class BlockingResources extends Gather {

  static gather(options) {
    const url = options.url;
    const driver = options.driver;
    const networkRecords = options.artifacts.networkRecords;
    const javascriptRequests = networkRecords.filter(record => {
      return record.data._initiator.type === 'parser' &&
          record.data._resourceType._name === 'script';
    });

    // Locate any records that were initiated by the parser, and which are CSS, or a font.
    const blockingResources = networkRecords.filter(record => {
      return record.data._initiator.type === 'parser' &&
          (record.data._resourceType._name === 'stylesheet' ||
           record.data._resourceType._name === 'font');
    });

    // Make a chain of queries to the DOM to find the appropriate element for each JS file.
    const DOMQueries = javascriptRequests.reduce((chain, request) => {
      // Remove the Page URL from the requests, which should then match on relative and absolute
      // URLs in the elements found in the DOM.
      const javaScriptURL = request.data.url.replace(url, '');
      return chain
        .then(_ => driver.querySelector(`script[src*="${javaScriptURL}"]`))
        .then(node => {
          // If there's an async or defer attribute, this is non-blocking.
          if (node.getAttribute('defer') !== null ||
            node.getAttribute('async') !== null) {
            return;
          }
          blockingResources.push(request);
        });
    }, Promise.resolve());

    return DOMQueries
      .then(_ => {
        return {blockingResources};
      });
  }
}

module.exports = BlockingResources;
