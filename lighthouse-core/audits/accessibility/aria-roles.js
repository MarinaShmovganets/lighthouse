/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Ensures all elements with a role attribute use a valid value.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class AriaRoles extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'aria-roles',
      description: '`[role]` values are valid.',
      fallbackDescription: '`[role]` values are not valid.',
      helpText: 'ARIA roles must have valid values in order to perform their ' +
          'intended accessibility functions. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/1.1/aria-roles).',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = AriaRoles;
