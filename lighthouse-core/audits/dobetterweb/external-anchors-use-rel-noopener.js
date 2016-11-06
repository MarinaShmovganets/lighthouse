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

const Audit = require('../audit');

class ExternalAnchorsUseRelNoopenerAudit extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'external-anchors-use-rel-noopener',
      description: 'Site does not have anchor links with target="_blank" and no rel="noopener"',
      helpText: 'links that open in a new tab should use <code>target="_blank"</code> and <code>rel="noopener"</code> so the <a href="https://jakearchibald.com/2016/performance-benefits-of-rel-noopener">opening page\'s perf does not suffer.</a>',
      requiredArtifacts: ['ExternalAnchorsWithRelNoopener']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const failingNodes =
        artifacts.Links.filter(result => {
          return result.target === '_blank' && result.rel !== 'noopener';
        });

    if (failingNodes.length > 0) {
      return ExternalAnchorsUseRelNoopenerAudit.generateAuditResult({
        displayValue: failingNodes.length,
        rawValue: false
      });
    }
    return ExternalAnchorsUseRelNoopenerAudit.generateAuditResult({
      rawValue: true
    });
  }
}

module.exports = ExternalAnchorsUseRelNoopenerAudit;
