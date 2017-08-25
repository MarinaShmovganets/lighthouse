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
 * known vulnerabilities being used. Checks against a vulnerability db
 * provided by Snyk.io and checked in locally as third-party/snyk-snapshot.json
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
      failureDescription: 'Includes front-end JavaScript libraries'
        + ' with known security vulnerabilities',
      helpText: 'Some third-party scripts may contain known security vulnerabilities ' +
        ' that are easily identified and exploited by attackers.',
      requiredArtifacts: ['JSVulnerableLibraries']
    };
  }
  /**
   * @param {object} vulns
   * @return {string}
   */
  static mostSevere(vulns) {
    vulns.map(vuln => {
      switch (vuln.severity) {
        case 'high':
          vuln.numericSeverity = 3;
          break;
        case 'medium':
          vuln.numericSeverity = 2;
          break;
        case 'low':
          vuln.numericSeverity = 1;
          break;
      }
    })
    .sort((itemA, itemB) => itemA.numericSeverity > itemB.numericSeverity);

    return vulns[0].severity.charAt(0).toUpperCase() + vulns[0].severity.slice(1);
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const libraries = artifacts.JSVulnerableLibraries;
    if (libraries.length) {
      let totalVulns = 0;
      const finalVulns = libraries.filter(obj => {
        return obj.vulns;
      })
      .map(lib => {
        lib.detectedLib = lib.name + '@' + lib.version;
        lib.vulnCount = lib.vulns.length;
        lib.highestSeverity = this.mostSevere(lib.vulns);
        totalVulns += lib.vulnCount;
        return lib;
      });

      let displayValue = '';
      if (totalVulns > 1) {
        displayValue = `${totalVulns} vulnerabilities detected.`;
      } else if (totalVulns === 1) {
        displayValue = `${totalVulns} vulnerability was detected.`;
      }

      const headings = [
        {key: 'detectedLib', itemType: 'text', text: 'Library Version'},
        {key: 'vulnCount', itemType: 'text', text: 'Vulnerability Count'},
        {key: 'highestSeverity', itemType: 'text', text: 'Highest Severity'}
      ];
      const details = Audit.makeTableDetails(headings, finalVulns);

      return {
        rawValue: totalVulns === 0,
        displayValue,
        extendedInfo: {
          jsLibs: libraries,
          vulnerabilities: finalVulns
        },
        details,
      };
    } else {
      return {
        rawValue: true,
        extendedInfo: {}
      };
    }
  }

}

module.exports = NoVulnerableLibrariesAudit;
