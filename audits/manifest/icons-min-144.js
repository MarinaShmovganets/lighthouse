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

    if (iconsAudit.audit(artifacts).value === false) {
      return ManifestIconsMin144.generateAuditResult(false);
    }

    const iconValues = artifacts.manifest.value.icons;
    const nestedSizes = iconValues.value.map(icon => icon.value.sizes.value);
    const flattenedSizes = [].concat.apply([], nestedSizes);

    const matchingIcons = flattenedSizes
        .filter(size => typeof size === "string")
        .map(size => size.split(/x/i))
        .map(pairStr => [parseFloat(pairStr[0]), parseFloat(pairStr[1])])
        .filter(pair => pair[0] >= 144)
        .filter(pair => pair[1] >= 144);

    return ManifestIconsMin144.generateAuditResult(!!matchingIcons.length);
  }
}

module.exports = ManifestIconsMin144;

