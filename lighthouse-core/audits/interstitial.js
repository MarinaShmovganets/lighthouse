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

class Interstitial extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'UX',
      name: 'interstitial',
      description: 'The page does not place interstitials over the page content',
      requiredArtifacts: ['Interstitial']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.Interstitial === 'undefined' ||
        !Array.isArray(artifacts.Interstitial)) {
      return Interstitial.generateAuditResult({
        rawValue: false,
        debugString: 'Unable to retrieve element information.'
      });
    }

    return Interstitial.generateAuditResult({
      rawValue: (artifacts.Interstitial.length === 0)
    });
  }
}

module.exports = Interstitial;
