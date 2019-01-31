/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  title: 'Document has a meta description',
  failureTitle: 'Document does not have a meta description',
  description: 'Meta descriptions may be included in search results to concisely summarize ' +
      'page content. ' +
      '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/description).',
}

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Description extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'meta-description',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['MetaElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const metaDescription = artifacts.MetaElements.find(meta => meta.name === 'description');
    if (!metaDescription) {
      return {
        rawValue: false,
      };
    }

    const description = metaDescription.content || '';
    if (description.trim().length === 0) {
      return {
        rawValue: false,
        explanation: 'Description text is empty.',
      };
    }

    return {
      rawValue: true,
    };
  }
}

module.exports = Description;
module.exports.UIStrings = UIStrings;
