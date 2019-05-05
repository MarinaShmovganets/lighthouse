/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

/**
 * @fileoverview Audits if a page's web app has an icon link for iOS installability.
 */

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user that their site contains a vaild touch icon. This descriptive title is shown when the page contains a valid iOS touch icon. "iOS" is the name of the Apple operating system and should not be translated. */
  title: 'Site a valid iOS touch icon',
  /** Title of a Lighthouse audit that tells the user that their site contains a vaild touch icon. This descriptive title is shown when the page does not contain a valid iOS touch icon. "iOS" is the name of the Apple operating system and should not be translated. */
  failureTitle: 'Site does not have a valid iOS touch icon',
  /** Description of a Lighthouse audit that tells the user what having a valid apple-touch-icon does. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description:
  'In order to be installable as an iOS PWA ' +
  'sites must have a valid apple-touch-icon. ' +
  '[Learn More](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).',
  /** Explanatory message stating that there was a failure in an audit caused by the page having an invalid apple-touch-icon link. `apple-touch-icon` is a HTML tag value and should not be translated. */
  explanation: 'No valid `apple-touch-icon` link found.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class IosPwaIcon extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'ios-pwa-icon',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['LinkElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} _
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, _) {
    const appleTouchIcons = artifacts.LinkElements.filter(
      el => el.rel === 'apple-touch-icon' && el.href !== undefined);

    // Audit passes if an `apple-touch-icon` exists.
    const passed = appleTouchIcons.length !== 0;

    let explanation;
    if (!passed) {
      explanation = str_(UIStrings.explanation);
    }

    return {
      score: passed ? 1 : 0,
      explanation,
    };
  }
}

module.exports = IosPwaIcon;
module.exports.UIStrings = UIStrings;
