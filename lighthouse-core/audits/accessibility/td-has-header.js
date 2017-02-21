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

/**
 * @fileoverview Ensure that each non-empty data cell in a large table has one or more table headers
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class TDHasHeader extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'td-has-header',
      description: 'All non-emply `<td>` elements in a table larger than 3 by 3 have an ' +
          'associated table header',
      helpText: 'Screen readers have features to make navigating tables easier. Ensuring `<td>` ' +
          'elements have an associated head may improve the experience for screen reader users.',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = TDHasHeader;
