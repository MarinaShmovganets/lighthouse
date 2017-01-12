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

/**
 * @fileoverview Audits a page to determine if it is calling deprecated APIs.
 */

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');

class Deprecations extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Deprecations',
      name: 'deprecations',
      description: 'Site does not use deprecated APIs',
      helpText: 'Your page uses APIs that are deprecated and will ' +
          'eventually be removed. [Learn more](https://www.chromestatus.com/features#deprecated).',
      requiredArtifacts: ['ConsoleViolations']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.ConsoleViolations.rawValue === -1) {
      return NoDateNowAudit.generateAuditResult({
        rawValue: artifacts.ConsoleViolations.rawValue,
        debugString: artifacts.ConsoleViolations.debugString
      });
    }

    const entries = artifacts.ConsoleViolations;
    const deprecations = entries.filter(log => log.entry.source === 'deprecation')
        .map(log => {
          const label = log.entry.lineNumber ? `line: ${log.entry.lineNumber}` : null;
          const url = log.entry.url || null;
          return Object.assign({
            label,
            url,
            code: log.entry.text
          }, log.entry);
        });

    let displayValue = '';
    if (deprecations.length > 1) {
      displayValue = `${deprecations.length} warnings found`;
    } else if (deprecations.length === 1) {
      displayValue = `${deprecations.length} warning found`;
    }

console.log(deprecations);

    return Deprecations.generateAuditResult({
      rawValue: deprecations.length === 0,
      displayValue,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: deprecations
      }
    });
  }
}

module.exports = Deprecations;
