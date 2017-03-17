/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const SWAudit = require('./service-worker');
const Formatter = require('../report/formatter');

/**
 * @fileoverview
 * Audits if a page is configured for a custom splash screen when launched
 * https://github.com/GoogleChrome/lighthouse/issues/24
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has a valid name
 *   * manifest has a valid background_color
 *   * manifest has a valid theme_color
 *   * manifest contains icon that's a png and size >= 512px
 */


//probably can delete
// name
// manifest-background-color
// manifest-icons-min-192"

// cannot delete:
      // "manifest-theme-color":
      

class SplashScreen extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'splash-screen',
      description: 'Configured for a custom splash screen',
      helpText: `A default splash screen will be constructed, but meeting these requirements guarantee a high-quality and customizable [splash screen](https://developers.google.com/web/updates/2015/10/splashscreen) the user sees between tapping the home screen icon and your app's first paint.`,
      requiredArtifacts: ['Manifest']
    };
  }


  static audit(artifacts) {
    const failures = [];

    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      // 1: validate manifest is in order
      manifestValues.forEach(item => {
        if (!item.groups.includes('validity') && !item.groups.includes('splash'))
          return;

        if (item.passing === false) {
          failures.push(item.userText);
        }
      });

      const extendedInfo = {
        value: {manifestValues, failures},
        formatter: Formatter.SUPPORTED_FORMATS.NULL
      };

      // If we fail, share the failures
      if (failures.length > 0) {
        return {
          rawValue: false,
          debugString: `Unsatisfied requirements: ${failures.join(', ')}.`,
          extendedInfo
        };
      }

      // Otherwise, we pass
      return {
        rawValue: true,
        extendedInfo
      };
    });
  }
}

module.exports = SplashScreen;
