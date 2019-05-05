/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

/**
 * @fileoverview Audits if a page's web app has a valid icon for iOS installability.
 */

class IosPwaIcon extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'ios-pwa-icon',
      title: 'Web app has a valid iOS touch icon',
      failureTitle: 'Web app does not have a valid iOS touch icon',
      description: 'In order to be installable as an iOS PWA '
        + 'web apps must have a valid apple-touch-icon. '
        + '[Learn More](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).',
      requiredArtifacts: ['LinkElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} _
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, _) {
    const appleTouchIcons = artifacts.LinkElements.filter(el => el.rel === 'apple-touch-icon');

    // Audit passes if an `apple-touch-icon` exists.
    const passed = appleTouchIcons.length !== 0;

    let explanation;
    if (!passed) {
      explanation = 'No `apple-touch-icon` link found.';
    }

    return {
      score: passed ? 1 : 0,
      explanation,
    };
  }
}

module.exports = IosPwaIcon;
