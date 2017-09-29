/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');

// PSI allows one redirect (http://example.com => http://m.example.com)
const REDIRECT_THRESHOLD = 1;

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
      requiredArtifacts: ['URL', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestMainResource(artifacts.devtoolsLogs[Audit.DEFAULT_PASS])
      .then(mainResource => {
        // redirects is only available when redirects happens
        const redirectRequests = mainResource.redirects || [];
        let totalWastedMs = 0;
        let debugString = null;

        const pageRedirects = redirectRequests.map(request => {
          const wastedMs = (request.endTime - request.startTime) * 1000;
          totalWastedMs += wastedMs;

          return {
            url: request.url,
            wastedMs: Util.formatMilliseconds(wastedMs),
          };
        });

        const passed = pageRedirects.length <= REDIRECT_THRESHOLD;
        if (!passed) {
          debugString = `Your page has ${pageRedirects.length} redirects.`;
        }

        const headings = [
          {key: 'url', itemType: 'text', text: 'URL'},
          {key: 'wastedMs', itemType: 'text', text: 'Wasted ms'},
        ];
        const details = Audit.makeTableDetails(headings, pageRedirects);

        return {
          debugString,
          score: passed,
          rawValue: totalWastedMs,
          displayValue: Util.formatMilliseconds(totalWastedMs),
          extendedInfo: {
            value: {
              wastedMs: totalWastedMs,
            },
          },
          details,
        };
      });
  }
}

module.exports = Redirects;
