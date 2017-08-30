/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NoVulnerableLibrariesAudit =
  require('../../../audits/dobetterweb/no-vulnerable-libraries.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Avoids front-end JavaScript libraries with known vulnerabilities', () => {
  it('fails when JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSVulnerableLibraries: [
        {
          name: 'lib1',
          version: '2.1.4',
          npmPkgName: 'lib1',
          pkgLink: 'https://lib1url.com',
          vulns:
          [{
            severity: 'high',
            library: 'lib1@2.1.4',
            url: 'https://lib1url.com/vuln1'
          }, {
            severity: 'medium',
            library: 'lib1@2.1.4',
            url: 'https://lib1url.com/vuln2'
          }, {
            severity: 'low',
            library: 'lib1@2.1.4',
            url: 'https://lib1url.com/vuln3'
          }]
        },
        {name: 'Lo-Dash', version: '3.10.1', npmPkgName: 'lodash'},
      ]
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 2);
    assert.equal(auditResult.displayValue, '3 vulnerabilities detected.');
    assert.equal(auditResult.details.items[0][2].text, 'High');
    assert.equal(auditResult.details.items[0][1].text, 3);
    assert.equal(auditResult.details.items[0][0].text, 'lib1@2.1.4');
    assert.equal(auditResult.details.items[0][0].url, 'https://lib1url.com');
  });

  it('fails when only one vulnerability is detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSVulnerableLibraries: [
        {
          name: 'lib1',
          version: '2.1.4',
          npmPkgName: 'lib1',
          pkgLink: 'https://lib1url.com',
          vulns:
          [{
            severity: 'low',
            library: 'lib1@2.1.4',
            url: 'https://lib1url.com/vuln3'
          }]
        },
      ]
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 1);
    assert.equal(auditResult.displayValue, '1 vulnerability was detected.');
    assert.equal(auditResult.details.items[0][2].text, 'Low');
    assert.equal(auditResult.details.items[0][1].text, 1);
    assert.equal(auditResult.details.items[0][0].text, 'lib1@2.1.4');
    assert.equal(auditResult.details.items[0][0].url, 'https://lib1url.com');
  });

  it('passes when no JS libraries with known vulnerabilities are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSVulnerableLibraries: [
        {name: 'lib1', version: '3.10.1', npmPkgName: 'lib1'},
        {name: 'lib2', version: null, npmPkgName: 'lib2'},
      ]
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.details.items.length, 0);
    assert.equal(auditResult.extendedInfo.jsLibs.length, 2);
  });

  it('passes when no JS libraries are detected', () => {
    const auditResult = NoVulnerableLibrariesAudit.audit({
      JSVulnerableLibraries: []
    });
    assert.equal(auditResult.rawValue, true);
  });
});
