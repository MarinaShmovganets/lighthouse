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
const iconsAudit = require('./icons');

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
    let debugString = '';

    if (iconsAudit.audit(artifacts).value == false) {
      return ManifestIconsMin144.generateAuditResult(false);
    }

    let iconSizes = [];
    artifacts.manifest.value.icons.value.forEach(icon => {
      iconSizes.push(...icon.value.sizes.value);
    });

    iconSizes
        .map(size => size.split(/x/i))
        .map(pairStr => [parseFloat(pairStr[0]), parseFloat(pairStr[1])])
        .filter(pair => pair[0] >= 144)
        .filter(pair => pair[1] >= 144)
        .forEach(pair => {
          if (pair[0] === pair[0]) {

          }
        })

    return ManifestIconsMin144.generateAuditResult(hasIconAtLeast144);
  }
}

module.exports = ManifestIconsMin144;


      // if (!sizesArray) {
      //   debugString = `Sizes property not found for ${icon.value.src.raw}`;
      //   return ManifestIconsMin144.generateAuditResult(hasIconAtLeast144, false, debugString);
      // }
