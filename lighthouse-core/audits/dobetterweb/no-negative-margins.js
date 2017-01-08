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

/**
 * @fileoverview Audit a page to see if it is using negative margins
 *     margin: -40px;
 */

'use strict';

const Audit = require('../audit');
const StyleHelpers = require('../../lib/styles-helpers');
const Formatter = require('../../formatters/formatter');

class NoNegativeMarginsAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'no-negative-margins',
      description: 'Site does not use negative margins',
      helpText: 'The use of negative margins can cause issue, try using flexbox instead.' +
          '<a href="https://developers.google.com/web/tools/lighthouse/audits/' +
          'no-negative-margins" target="_blank" rel="noopener">Learn more</a>.',
      requiredArtifacts: ['Styles']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.Styles.rawValue === -1) {
      return NoNegativeMarginsAudit.generateAuditResult(artifacts.Styles);
    }


    const sheetsUsingNegativeMargins = StyleHelpers.filterStylesheetsByUsage(
        artifacts.Styles, 'margin', '-');

    const urlList = [];
    sheetsUsingNegativeMargins.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        const formattedStyleRule = StyleHelpers.getFormattedStyleRule(sheet.content, props);
        urlList.push({
          url: sheet.header.sourceURL,
          label: formattedStyleRule.location,
          code: formattedStyleRule.styleRule
        });
      });
    });

    return NoNegativeMarginsAudit.generateAuditResult({
      rawValue: sheetsUsingNegativeMargins.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: urlList
      }
    });
  }
}

module.exports = NoNegativeMarginsAudit;
