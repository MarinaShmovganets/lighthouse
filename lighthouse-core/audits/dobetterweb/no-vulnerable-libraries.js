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
const Formatter = require('../../report/formatter');

class NoVulnerableLibrariesAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Security',
      name: 'no-vulnerable-libraries',
      description: 'Avoids using any libraries with known security vulnerabilities',
      helpText: 'Sites should take care to ensure that they are not using any' +
        ' JavaScript libraries that contain known security vulnerabilities.',
      requiredArtifacts: ['JSVulnerableLibraries']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const vulns = artifacts.JSVulnerableLibraries;

    // Filter requests that are on the same host as the page and not over h2.
    const finalVulns = vulns.map(record => {
      return {
        severity: record.severity,
        library: record.name + '@' + record.version,
        url: 'https://snyk.io/vuln/' + record.id
      };
    });

    let displayValue = '';
    if (vulns.length > 1) {
      displayValue = `${vulns.length} vulnerabilities detected.`;
    } else if (vulns.length === 1) {
      displayValue = `${vulns.length} vulnerability was detected.`;
    }

    const headings = [
      {key: 'url', itemType: 'url', text: 'Details'},
      {key: 'library', itemType: 'text', text: 'Library'},
      {key: 'severity', itemType: 'text', text: 'Severity'}
    ];
    const details = Audit.makeV2TableDetails(headings, finalVulns);

    return {
      rawValue: vulns.length === 0,
      displayValue: displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results: finalVulns,
          tableHeadings: {
            url: 'Details',
            library: 'Library',
            severity: 'Severity'
          }
        }
      },
      details,
    };
  }

}

module.exports = NoVulnerableLibrariesAudit;
