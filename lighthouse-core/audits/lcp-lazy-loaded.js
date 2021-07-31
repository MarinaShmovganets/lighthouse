/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Descriptive title of a diagnostic audit that provides */
  title: 'LCP element was lazy-loaded',
  /** Description of a Lighthouse audit that tells */
  description: '',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LargestContentfulPaintElement extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'lcp-lazy-loaded',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['TraceElements', 'ImageElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const images = artifacts.ImageElements;
    const lazyLoadedImages = images.filter(
      image => image.loading === 'lazy');
    const lcpElement = artifacts.TraceElements
      .find(element => element.traceEventType === 'largest-contentful-paint');

    const lcpElementDetails = [];
    if (lcpElement) {
      const lcpImageElement = lazyLoadedImages.find(elem => {
        return elem.node.devtoolsNodePath === lcpElement.node.devtoolsNodePath;
      });
      if (lcpImageElement) {
        lcpElementDetails.push({
          node: Audit.makeNodeItem(lcpImageElement.node),
        });
      }
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnElement)},
    ];

    const details = Audit.makeTableDetails(headings, lcpElementDetails);

    const displayValue = str_(i18n.UIStrings.displayValueElementsFound,
      {nodeCount: lcpElementDetails.length});

    return {
      score: 0,
      notApplicable: lcpElementDetails.length === 0,
      displayValue,
      details,
    };
  }
}

module.exports = LargestContentfulPaintElement;
module.exports.UIStrings = UIStrings;
