/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the doctype of a page. This descriptive title is shown to users when the pages's doctype is set to HTML. */
  title: 'Page has the HTML doctype',
  /** Title of a Lighthouse audit that provides detail on the doctype of a page. This descriptive title is shown to users when the page's doctype is not set to HTML. */
  failureTitle: 'Page lacks the HTML doctype, thus triggering quirks-mode',
  /** Description of a Lighthouse audit that tells the user why they should define an HTML doctype. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Specifying a doctype prevents the browser ' +
    'from switching to quirks-mode. ' +
    '[Learn more about doctype declaration](https://web.dev/doctype/).',
  /** Explanatory message stating that the document has no doctype. */
  explanationNoDoctype: 'Document must contain a doctype',
  /** Explanatory message stating that the document has wrong doctype */
  explanationWrongDoctype: 'Document contains a doctype that triggers quirks-mode',
  /** Explanatory message stating that the publicId field is not empty. */
  explanationPublicId: 'Expected publicId to be an empty string',
  /** Explanatory message stating that the systemId field is not empty. */
  explanationSystemId: 'Expected systemId to be an empty string',
  /** Explanatory message stating that the doctype is set, but is not "html" and is therefore invalid. */
  explanationBadDoctype: 'Doctype name must be the string `html`',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Doctype extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'doctype',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Doctype'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    if (!artifacts.Doctype) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationNoDoctype),
      };
    }

    // only set constants once we know there is a doctype
    const doctypeName = artifacts.Doctype.name;
    const doctypePublicId = artifacts.Doctype.publicId;
    const doctypeSystemId = artifacts.Doctype.systemId;
    const compatMode = artifacts.Doctype.documentCompatMode;

    if (doctypePublicId !== '') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationPublicId),
      };
    }

    if (doctypeSystemId !== '') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationSystemId),
      };
    }

    /* Note that the casing of this property is normalized to be lowercase.
       see: https://html.spec.whatwg.org/#doctype-name-state */
    if (doctypeName !== 'html') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationBadDoctype),
      };
    }

    // Catch-all for any quirks-mode situations the above checks didn't get.
    // https://github.com/GoogleChrome/lighthouse/issues/10030
    if (compatMode === 'BackCompat') {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationWrongDoctype),
      };
    } else {
      return {
        score: 1,
      };
    }
  }
}

module.exports = Doctype;
module.exports.UIStrings = UIStrings;
