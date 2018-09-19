/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audits a page to see how the size of DOM it creates. Stats like
 * tree depth, # children, and total nodes are returned. The score is calculated
 * based solely on the total number of nodes found on the page.
 */

'use strict';

const Audit = require('../audit');
const Util = require('../../report/html/renderer/util.js');
const i18n = require('../../lib/i18n');

const MAX_DOM_NODES = 1500;
const MAX_DOM_TREE_WIDTH = 60;
const MAX_DOM_TREE_DEPTH = 32;

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM nodes and greatest DOM depth. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Avoids an excessive DOM size',
  /** Title of a diagnostic audit that provides detail on the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM nodes and greatest DOM depth. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Avoid an excessive DOM size',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM nodes and greatest DOM depth. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Browser engineers recommend pages contain fewer than ' +
    `~${MAX_DOM_NODES.toLocaleString()} DOM nodes. The sweet spot is a tree ` +
    `depth < ${MAX_DOM_TREE_DEPTH} elements and fewer than ${MAX_DOM_TREE_WIDTH} ` +
    'children/parent element. A large DOM can increase memory usage, cause longer ' +
    '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
    'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/tools/lighthouse/audits/dom-size).',
  /** Table column header for the type of analytic found. */
  columnCategory: 'Category',
  /** Table column header for DOM Element's snippet. */
  columnElement: 'Element',
  /** Table column header for the observed analytic's value. */
  columnObserved: 'Observed',
  /** [ICU Syntax] Label for an audit identifying the number of DOM nodes found in the page. */
  displayValue: `{itemCount, plural,
    =1 {1 node}
    other {# nodes}
    }`,
  /** Label for the total number of DOM nodes found in the page. */
  categoryDOMNodes: 'Total DOM Nodes',
  /** Label for the numeric value of the maximum depth in the page's DOM tree. */
  categoryDOMDepth: 'Maximum DOM Depth',
  /** Label for the value of the maximum number of children any DOM node in the page has. */
  categoryDOMWidth: 'Maximum Children',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);


class DOMSize extends Audit {
  static get MAX_DOM_NODES() {
    return MAX_DOM_NODES;
  }

  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'dom-size',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['DOMStats'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // 25th and 50th percentiles HTTPArchive -> 50 and 75
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // see https://www.desmos.com/calculator/vqot3wci4g
      scorePODR: 700,
      scoreMedian: 1400,
    };
  }


  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product}
   */
  static audit(artifacts, context) {
    const stats = artifacts.DOMStats;

    const score = Audit.computeLogNormalScore(
      stats.totalDOMNodes,
      context.options.scorePODR,
      context.options.scoreMedian
    );

    const headings = [
      {key: 'category', itemType: 'text', text: str_(UIStrings.columnCategory)},
      {key: 'element', itemType: 'code', text: str_(UIStrings.columnElement)},
      {key: 'observed', itemType: 'text', text: str_(UIStrings.columnObserved)},
    ];

    /** @type {Array<Object<string, LH.Audit.DetailsItem>>} */
    const items = [
      {
        category: str_(UIStrings.categoryDOMNodes),
        element: '',
        observed: Util.formatNumber(stats.totalDOMNodes),
      },
      {
        category: str_(UIStrings.categoryDOMDepth),
        element: {
          type: 'code',
          value: stats.depth.snippet,
        },
        observed: Util.formatNumber(stats.depth.max),
      },
      {
        category: str_(UIStrings.categoryDOMWidth),
        element: {
          type: 'code',
          value: stats.width.snippet,
        },
        observed: Util.formatNumber(stats.width.max),
      },
    ];

    return {
      score,
      rawValue: stats.totalDOMNodes,
      displayValue: str_(UIStrings.displayValue, {itemCount: stats.totalDOMNodes}),
      extendedInfo: {
        value: items,
      },
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = DOMSize;
module.exports.UIStrings = UIStrings;
