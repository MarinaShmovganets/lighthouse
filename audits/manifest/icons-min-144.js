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
const icons = require('../../helpers/icons');

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
    return 'manifest-icons-min-144';
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
    const manifest = artifacts.manifest.value;

    if (icons.doExist(manifest) === false) {
      return ManifestIconsMin144.generateAuditResult(false, undefined,
              'WARNING: No icons found in the manifest');
    }

    const matchingIcons = icons.sizeAtLeast(144, manifest);

    return ManifestIconsMin144.generateAuditResult(!!matchingIcons.length, undefined,
      !!matchingIcons.length && `Found icons of sizes: ${matchingIcons}`);
  }
}

module.exports = ManifestIconsMin144;

