/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');

class ManifestShortNameLength extends MultiCheckAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'manifest-short-name-length',
      title: 'The `short_name` won\'t be truncated on the homescreen',
      failureTitle: 'The `short_name` will be truncated on the homescreen',
      description: 'Make your app\'s `short_name` fewer than 12 characters to ' +
          'ensure that it\'s not truncated on homescreens. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-short_name-is-not-truncated).',
      requiredArtifacts: ['Manifest'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<{failures: Array<string>, manifestValues: LH.Artifacts.ManifestValues, notApplicable?: boolean}>}
   */
  static audit_(artifacts) {
    /** @type {Array<string>} */
    const failures = [];
    /** @type {Array<string>} */
    const warnings = [];

    return artifacts.requestManifestValues(artifacts.Manifest).then(manifestValues => {
      const result = {warnings, failures, manifestValues};

      // If there's no valid manifest, this audit is not applicable
      if (manifestValues.isParseFailure) {
        result.notApplicable = true;
        return result;
      }

      const shortNameCheck = manifestValues.allChecks.find(i => i.id === 'hasShortName');
      const shortNameLengthCheck = manifestValues.allChecks.find(i => i.id === 'shortNameLength');

      // If there's no short_name present, this audit is not applicable
      if (shortNameCheck && !shortNameCheck.passing) {
        result.notApplicable = true;
        return result;
      }

      if (shortNameLengthCheck && !shortNameLengthCheck.passing) {
        failures.push(shortNameLengthCheck.failureText);
      }

      return result;
    });
  }
}

module.exports = ManifestShortNameLength;
