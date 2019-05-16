/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class ContentWidth extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'content-width',
      title: 'Content is sized correctly for the viewport',
      failureTitle: 'Content is not sized correctly for the viewport',
      description: 'If the width of your app\'s content doesn\'t match the width ' +
          'of the viewport, your app might not be optimized for mobile screens. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/content-sized-correctly-for-viewport).',
      requiredArtifacts: ['ViewportDimensions', 'HostUserAgent'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, context) {
<<<<<<< HEAD
=======
    const userAgent = artifacts.HostUserAgent;
>>>>>>> origin/branch-3.2.x
    const viewportWidth = artifacts.ViewportDimensions.innerWidth;
    const windowWidth = artifacts.ViewportDimensions.outerWidth;
    const widthsMatch = viewportWidth === windowWidth;

<<<<<<< HEAD
    if (context.settings.disableDeviceEmulation) {
=======
    // TODO(phulce): refactor this `isMobile` boolean to be on context
    const isMobileHost = userAgent.includes('Android') || userAgent.includes('Mobile');
    const isMobile = context.settings.emulatedFormFactor === 'mobile' ||
      (context.settings.emulatedFormFactor !== 'desktop' && isMobileHost);

    if (isMobile) {
      return {
        rawValue: widthsMatch,
        explanation: this.createExplanation(widthsMatch, artifacts.ViewportDimensions),
      };
    } else {
>>>>>>> origin/branch-3.2.x
      return {
        rawValue: true,
        notApplicable: true,
      };
    }
<<<<<<< HEAD

    return {
      rawValue: widthsMatch,
      explanation: this.createExplanation(widthsMatch, artifacts.ViewportDimensions),
    };
=======
>>>>>>> origin/branch-3.2.x
  }

  /**
   * @param {boolean} match
   * @param {LH.Artifacts.ViewportDimensions} artifact
   * @return {string}
   */
  static createExplanation(match, artifact) {
    if (match) {
      return '';
    }

    return 'The viewport size is ' + artifact.innerWidth + 'px, ' +
        'whereas the window size is ' + artifact.outerWidth + 'px.';
  }
}

module.exports = ContentWidth;
