/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to make sure there are no JS libraries with
 * known vulnerabilities being used. Checks against a vulnerability db
 * provided by Snyk.io and checked in locally as third-party/snyk-snapshot.json
 */

'use strict';

const Audit = require('../audit');
const fs = require('fs');
const semver = require('semver');

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
      requiredArtifacts: ['JSLibraries'],
    };
  }

  /**
   * @return {!object}
   */
  static get snykDB() {
    return JSON.parse(fs.readFileSync(
      require.resolve('../../../third-party/snyk-snapshot.json'), 'utf8'));
  }

  /**
   * @return {!object}
   */
  static get severityMap() {
    return {
      high: 3,
      medium: 2,
      low: 1,
    };
  }

  /**
   * @param {object} lib
   * @return {object}
   */
  static getVulns(lib, snykDB) {
    const vulns = [];
    if (!snykDB.npm[lib.npmPkgName]) {
      return vulns;
    }

    lib.pkgLink = 'https://snyk.io/vuln/npm:' + lib.npmPkgName
      + '#lh@' + lib.version;
    const snykInfo = snykDB.npm[lib.npmPkgName];
    snykInfo.forEach(vuln => {
      if (semver.satisfies(lib.version, vuln.semver.vulnerable[0])) {
        // valid vulnerability
        vulns.push({
          severity: vuln.severity,
          library: `${lib.name}@${lib.version}`,
          url: 'https://snyk.io/vuln/' + vuln.id,
        });
      }
    });
    return vulns;
  }

  /**
   * @param {object} vulns
   * @return {string}
   */
  static mostSevere(vulns) {
    const sortedVulns = vulns
      .map(vuln => {
        vuln.numericSeverity = this.severityMap[vuln.severity];
        return vuln;
      })
      .sort((a, b) => b.numericSeverity - a.numericSeverity);
    return sortedVulns[0].severity;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const libraries = artifacts.JSLibraries;
    if (!libraries.length) {
      return {
        rawValue: true,
        extendedInfo: {},
      };
    }

    let totalVulns = 0;
    const finalVulns = libraries.map(lib => {
      lib.vulns = this.getVulns(lib, this.snykDB);
      if (lib.vulns.length > 0) {
        lib.vulnCount = lib.vulns.length;
        lib.highestSeverity = this.mostSevere(lib.vulns).replace(/^\w/, l => l.toUpperCase());
        totalVulns += lib.vulnCount;
        lib.detectedLib = {};
        lib.detectedLib.text = lib.name + '@' + lib.version;
        lib.detectedLib.url = lib.pkgLink;
        lib.detectedLib.type = 'link';
      }
      return lib;
    })
    .filter(obj => {
      return obj.vulns.length > 0;
    });

    let displayValue = '';
    if (totalVulns > 1) {
      displayValue = `${totalVulns} vulnerabilities detected.`;
    } else if (totalVulns === 1) {
      displayValue = `${totalVulns} vulnerability was detected.`;
    }

    const headings = [
      {key: 'detectedLib', itemType: 'link', text: 'Library Version'},
      {key: 'vulnCount', itemType: 'text', text: 'Vulnerability Count'},
      {key: 'highestSeverity', itemType: 'text', text: 'Highest Severity'},
    ];
    const details = Audit.makeTableDetails(headings, finalVulns);

    return {
      rawValue: totalVulns === 0,
      displayValue,
      extendedInfo: {
        jsLibs: libraries,
        vulnerabilities: finalVulns,
      },
      details,
    };
  }

}

module.exports = NoVulnerableLibrariesAudit;
