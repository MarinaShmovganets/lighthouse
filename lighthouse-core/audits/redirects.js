/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

// PSI allows one redirect (http://example.com => http://m.example.com)
const REDIRECT_TRESHOLD = 1;

class Redirects extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'redirects',
      description: 'Avoids page redirects.',
      failureDescription: 'Has page redirects.',
      helpText: ' Redirects introduce additional delays before the page can be loaded. [Learn more](https://developers.google.com/speed/docs/insights/AvoidRedirects).',
      requiredArtifacts: ['URL', 'devtoolsLogs']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestCriticalRequestChains(artifacts.devtoolsLogs[Audit.DEFAULT_PASS])
      .then(criticalRequests => {
        const pageRedirects = [];
        let debugString = null;

        let requests = criticalRequests;
        let requestKey;
        while (
          (requestKey = Redirects.getKeyOfFirstRequest(requests)) &&
          Redirects.isRedirect(requestKey)
        ) {
          const child = requests[requestKey];
          pageRedirects.push({
            url: child.request.url,
          });

          requests = child.children;
        }

        const passed = pageRedirects.length <= REDIRECT_TRESHOLD;
        if (!passed) {
          debugString = `Your page has ${pageRedirects.length} redirects.` +
            ' Redirects introduce additional delays before the page can be loaded.';
        }

        const headings = [
          {key: 'url', itemType: 'text', text: 'URL'},
        ];
        const details = Audit.makeTableDetails(headings, pageRedirects);

        return {
          debugString,
          displayValue: pageRedirects.length,
          rawValue: passed,
          extendedInfo: {
            value: pageRedirects
          },
          details
        };
      });
  }

  static isRedirect(requestKey) {
    return requestKey.includes('redirected');
  }

  static getKeyOfFirstRequest(children) {
    const requestKeys = Object.keys(children);

    return requestKeys[0];
  }
}

module.exports = Redirects;
