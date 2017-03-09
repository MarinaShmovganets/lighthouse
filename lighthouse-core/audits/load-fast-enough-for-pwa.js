/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const TTIMetric = require('./time-to-interactive');
const Formatter = require('../formatters/formatter');

// Maximum TTI to be considered "fast" for PWA baseline checklist
//   https://developers.google.com/web/progressive-web-apps/checklist
const MAXIMUM_TTI = 10 * 1000;

class LoadFastEnough4Pwa extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'PWA',
      name: 'load-fast-enough-for-pwa',
      description: 'Page load is fast enough on 3G',
      helpText: 'Satisfied if the _Time To Interactive_ duration is shorter than _10 seconds_, as defined by the [PWA Baseline Checklist](https://developers.google.com/web/progressive-web-apps/checklist).',
      requiredArtifacts: ['traces']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return TTIMetric.audit(artifacts).then(ttiResult => {
      const timeToInteractive = ttiResult.extendedInfo.value.timings.timeToInteractive;
      const isFast = timeToInteractive < MAXIMUM_TTI;

      const extendedInfo = {
        formatter: Formatter.SUPPORTED_FORMATS.NULL,
        value: {timeToInteractive}
      };

      if (!isFast) {
        return LoadFastEnough4Pwa.generateAuditResult({
          rawValue: false,
          debugString: `Under mobile conditions, the TTI was at ${ttiResult.displayValue}. ` +
          'More details in "Performance" section.',
          extendedInfo
        });
      }

      return LoadFastEnough4Pwa.generateAuditResult({
        rawValue: true,
        extendedInfo
      });
    });
  }
}

module.exports = LoadFastEnough4Pwa;
