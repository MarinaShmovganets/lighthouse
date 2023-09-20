/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures elements with an ARIA role are contained by their required parents.
 * e.g. A child node with role="listitem" should be contained by a parent with role="list".
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates valid aria-role usage. Some ARIA roles require that elements must be a child of specific parent element. This audit checks that when those roles are used, the element with the role is in fact a child of the required parent. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`[role]`s are contained by their required parent element',
  /** Title of an accesibility audit that evaluates valid aria-role usage. Some ARIA roles require that elements must be a child of specific parent element. This audit checks that when those roles are used, the element with the role is in fact a child of the required parent. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`[role]`s are not contained by their required parent element',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Some ARIA child roles must be contained by specific parent roles to ' +
      'properly perform their intended accessibility functions. ' +
      '[Learn more about ARIA roles and required parent element](https://dequeuniversity.com/rules/axe/4.8/aria-required-parent).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class AriaRequiredParent extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'aria-required-parent',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default AriaRequiredParent;
export {UIStrings};
