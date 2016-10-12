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
 * @fileoverview Audit a page to see if it is using the obsolete
 *     `display: box` flexbox.
 */

'use strict';

const Audit = require('../audit');
const StyleHelpers = require('../../lib/styles-helpers');
const Formatter = require('../../formatters/formatter');

class NoOldFlexboxAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'CSS',
      name: 'no-old-flexbox',
      description: 'Site does not use the old CSS flexbox',
      helpText: 'The older spec for CSS Flexbox (<code>display: box</code>) is deprecated and <a href="https://developers.google.com/web/updates/2013/10/Flexbox-layout-isn-t-slow?hl=en" target="_blank">less performant</a>. Consider using the <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Using_CSS_flexible_boxes" target="_blank">newer version</a> (<code>display: flex</code>), which does not suffer from the same issues.',
      requiredArtifacts: ['Styles']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.Styles === 'undefined' ||
        artifacts.Styles === -1) {
      return NoOldFlexboxAudit.generateAuditResult({
        rawValue: -1,
        debugString: 'Styles gatherer did not run'
      });
    } else if (artifacts.Styles.rawValue === -1) {
      return NoOldFlexboxAudit.generateAuditResult(artifacts.Styles);
    }

    // TODO: consider usage of vendor prefixes
    // TODO: consider usage of other older properties from
    // https://www.w3.org/TR/2009/WD-css3-flexbox-20090723/
    // (e.g. box-flex, box-orient, box-flex-group, display: flexbox (2011 version))
    const sheetsUsingDisplayBox = StyleHelpers.filterStylesheetsByUsage(
        artifacts.Styles, 'display', 'box'); // 2009 version

    const urlList = [];
    sheetsUsingDisplayBox.forEach(sheet => {
      sheet.parsedContent.forEach(props => {
        urlList.push({
          url: sheet.header.sourceURL,
          misc: StyleHelpers.getFormattedStyleRule(sheet.content, props)
        });
      });
    });

    return NoOldFlexboxAudit.generateAuditResult({
      rawValue: sheetsUsingDisplayBox.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: urlList
      }
    });
  }
}

module.exports = NoOldFlexboxAudit;
