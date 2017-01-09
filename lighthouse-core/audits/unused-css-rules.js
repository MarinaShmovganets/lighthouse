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

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');
const ALLOWABLE_UNUSED_RULES_RATIO = 0.10;

class UnusedCSSRules extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Best Practices',
      name: 'unused-css-rules',
      description: 'Site does not have more than 10% unused CSS',
      helpText: 'Remove unused rules from stylesheets to reduce unnecessary ' +
          'bytes consumed by network activity.',
      requiredArtifacts: ['CSSUsage', 'Styles']
    };
  }

  static indexStylesheetsById(styles) {
    return styles.reduce((indexed, stylesheet) => {
      indexed[stylesheet.header.styleSheetId] = Object.assign({
        used: [],
        unused: [],
      }, stylesheet);
      return indexed;
    }, {});
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const styles = artifacts.Styles;
    const usage = artifacts.CSSUsage;

    if (typeof styles === 'undefined' || typeof usage === 'undefined') {
      return UnusedCSSRules.generateAuditResult({
        rawValue: -1,
        debugString: 'Styles or CSSUsage Gatherer did not run',
      });
    } else if (styles.rawValue === -1) {
      return UnusedCSSRules.generateAuditResult(styles);
    } else if (usage.rawValue === -1) {
      return UnusedCSSRules.generateAuditResult(usage);
    }

    let numUnusedRules = 0;
    let numTotalRules = 0;
    const indexedStylesheets = UnusedCSSRules.indexStylesheetsById(styles);
    usage.forEach(rule => {
      const stylesheetInfo = indexedStylesheets[rule.styleSheetId];

      if (rule.used) {
        stylesheetInfo.used.push(rule);
      } else {
        numUnusedRules++;
        stylesheetInfo.unused.push(rule);
      }

      numTotalRules++;
    });

    const results = Object.keys(indexedStylesheets).map(stylesheetId => {
      const stylesheetInfo = indexedStylesheets[stylesheetId];
      const numUsed = stylesheetInfo.used.length;
      const numUnused = stylesheetInfo.unused.length;
      const percentUsed = Math.round(100 * numUsed / (numUsed + numUnused));
      return {
        url: stylesheetInfo.header.sourceURL || 'inline',
        label: `${percentUsed}% rules used`,
        code: stylesheetInfo.content.slice(0, 100),
      };
    });

    let displayValue = '';
    if (numUnusedRules > 1) {
      displayValue = `${numUnusedRules} CSS rules were unused`;
    } else if (numUnusedRules === 1) {
      displayValue = `${numUnusedRules} CSS rule was unused`;
    }

    return UnusedCSSRules.generateAuditResult({
      displayValue,
      rawValue: numUnusedRules / numTotalRules > ALLOWABLE_UNUSED_RULES_RATIO,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = UnusedCSSRules;
