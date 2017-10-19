/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const BLOCKLIST = new Set([
  'noindex',
  'none',
]);
const ROBOTS_HEADER = 'x-robots-tag';

class IsCrawlable extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'is-crawlable',
      description: 'Page isn’t blocked from indexing',
      failureDescription: 'Page is blocked from indexing',
      helpText: 'The “Robots” directives tell crawlers how your content should be indexed. ' +
        '[Learn more](https://developers.google.com/search/reference/robots_meta_tag).',
      requiredArtifacts: ['MetaRobots'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestMainResource(artifacts.devtoolsLogs[Audit.DEFAULT_PASS])
      .then(mainResource => {
        if (artifacts.MetaRobots) {
          const blockingDirective = artifacts.MetaRobots
            .split(',')
            .map(d => d.toLowerCase().trim())
            .find(d => BLOCKLIST.has(d));

          if (blockingDirective) {
            return {
              rawValue: false,
              extendedInfo: {
                value: {
                  type: 'tag',
                  directive: blockingDirective,
                },
              },
            };
          }
        }

        const robotsHeader = mainResource.responseHeaders()
          .find(h => h.name.toLowerCase() === ROBOTS_HEADER);

        if (robotsHeader) {
          const blockingDirective = robotsHeader.value
            .split(',')
            .map(d => d.toLowerCase().trim())
            .find(d => BLOCKLIST.has(d));

          if (blockingDirective) {
            return {
              rawValue: false,
              extendedInfo: {
                value: {
                  type: 'header',
                  directive: blockingDirective,
                },
              },
            };
          }
        }

        return {
          rawValue: true,
        };
      });
  }
}

module.exports = IsCrawlable;
