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
 * @fileoverview Ensure that tables with a caption use the `<caption>` element.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class TableFakeCaption extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Accessibility',
      name: 'table-fake-caption',
      description: 'Data tables do not use a colspan to visually indicate a caption.',
      helpText: 'Screen readers have features to specifically call out captions in data tables. ' +
          'If a `colspan` is used instead of a `<caption>` element, screen reader users may miss ' +
          'out on these features.',
      requiredArtifacts: ['Accessibility']
    };
  }
}

module.exports = TableFakeCaption;
