/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Audits a page to make sure there are no JS libraries with
 * known vulnerabilities being used.
 */

'use strict';

const Audit = require('../audit');

class NoVulnerableLibrariesAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Security',
      name: 'no-vulnerable-libraries',
      description: 'Avoids front-end JavaScript libraries'
        + ' with known security vulnerabilities',
      helpText: 'Some third-party scripts may contain known security vulnerabilities ' +
        ' that are easily identified and exploited by attackers.',
      requiredArtifacts: ['JSVulnerableLibraries']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const libraries = artifacts.JSVulnerableLibraries.libraries;

    const finalVulns = Object.assign(...libraries.filter(obj => {
      return obj.vulns;
    }).map(record => {
      const libVulns = [];
      for (const i in record.vulns) {
        if (Object.hasOwnProperty.call(record.vulns, i)) {
          libVulns.push(record.vulns[i]);
        }
      }
      return libVulns;
    }));

    let displayValue = '';
    if (finalVulns.length > 1) {
      displayValue = `${finalVulns.length} vulnerabilities detected.`;
    } else if (finalVulns.length === 1) {
      displayValue = `${finalVulns.length} vulnerability was detected.`;
    }

    const headings = [
      {key: 'url', itemType: 'text', text: 'Details'},
      {key: 'library', itemType: 'text', text: 'Library'},
      {key: 'severity', itemType: 'text', text: 'Severity'}
    ];
    const details = Audit.makeV2TableDetails(headings, finalVulns);

    return {
      rawValue: finalVulns.length === 0,
      displayValue,
      extendedInfo: {
        js_libs: libraries,
        vulnerabilities: finalVulns
      },
      details,
    };
  }

}

module.exports = NoVulnerableLibrariesAudit;
