/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures tabindex attribute values are not greater than 0.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';

import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if any elements have custom tabindex HTML attributes that might frustrate users of assitive technology. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: 'No element has a `[tabindex]` value greater than 0',
  /** Title of an accesibility audit that evaluates if any elements have custom tabindex HTML attributes that might frustrate users of assitive technology. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: 'Some elements have a `[tabindex]` value greater than 0',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'A value greater than 0 implies an explicit navigation ordering. ' +
      'Although technically valid, this often creates frustrating experiences ' +
      'for users who rely on assistive technologies. [Learn more about the `tabindex` attribute](https://dequeuniversity.com/rules/axe/4.4/tabindex).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class TabIndex extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'tabindex',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default TabIndex;
export {UIStrings};
