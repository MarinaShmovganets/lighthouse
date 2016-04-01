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

const Audit = require('../audit');

class ManifestIconsMin144 extends Audit {
  /**
   * @override
   */
  static get tags() {
    return ['Manifest'];
  }

  /**
   * @override
   */
  static get name() {
    return 'manifest-icons-min144';
  }

  /**
   * @override
   */
  static get description() {
    return 'Manifest contains icons at least 144px';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let hasIconAtLeast144 = false;
    const manifest = artifacts.manifest.value;

    if (!manifest || !manifest.icons.value) {
      return ManifestIconsMin144.generateAuditResult(false);
    }

    manifest.icons.value.forEach(icon => {
      const sizesArray = icon.value.sizes.value;
      !!sizesArray && sizesArray.forEach(size => {
        const pair = size.split(/x/i);
        if (pair[0] && parseFloat(pair[0]) >= 144) {
          hasIconAtLeast144 = true;
        }
      });
    });
    return ManifestIconsMin144.generateAuditResult(hasIconAtLeast144);
  }
}

module.exports = ManifestIconsMin144;
