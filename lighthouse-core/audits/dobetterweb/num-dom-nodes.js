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

/**
 * @fileoverview Audits a page to see how many DOM nodes it creates.
 */

'use strict';

const Audit = require('../audit');
const TracingProcessor = require('../../lib/traces/tracing-processor');
const Formatter = require('../../formatters/formatter');

const MAX_DOM_NODES = 1500;
const MAX_DOM_TREE_WIDTH = 60;
const MAX_DOM_TREE_DEPTH = 32;

// Parameters for log-normal CDF scoring. See https://www.desmos.com/calculator/mcxlbfq8ew.
const SCORING_POINT_OF_DIMINISHING_RETURNS = MAX_DOM_NODES;
const SCORING_MEDIAN = 2000;

class DOMSize extends Audit {
  static get MAX_DOM_NODES() {
    return 1500;
  }

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'num-dom-nodes',
      description: 'Avoids an excessive DOM size',
      optimalValue: SCORING_POINT_OF_DIMINISHING_RETURNS.toLocaleString() + ' nodes',
      helpText: 'Browser engineers recommend pages contain fewer than ' +
        `~${MAX_DOM_NODES} DOM nodes. The sweet spot is around ` +
        `${MAX_DOM_TREE_WIDTH} elements wide and ${MAX_DOM_TREE_DEPTH} ` +
        'elements deep. A large DOM can increase memory, cause longer ' +
        '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
        'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/fundamentals/performance/rendering/).',
      requiredArtifacts: ['DOMStats']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const stats = artifacts.DOMStats;

    // const passesTotal = stats.totalDOMNodes <= MAX_DOM_NODES;
    // const passesMaxDepth = stats.depth.max <= MAX_DOM_TREE_DEPTH;
    // const passesMaxWidth = stats.width.max <= MAX_DOM_TREE_WIDTH;
    // const displayValue = passesTotal ? '' : `${stats.totalDOMNodes} nodes`;

    // const depthSnippet = stats.depth.pathToElement.reduce((str, curr, i) => {
    //   return `${str}\n` + '  '.repeat(i) + `${curr} >`;
    // }, '');
    // const widthSnippet = stats.width.pathToElement.reduce((str, curr, i) => {
    //   return `${str}\n` + '  '.repeat(i) + `${curr} >`;
    // }, '');
    const depthSnippet = stats.depth.pathToElement.join(' > ');
    const widthSnippet = stats.width.pathToElement[stats.width.pathToElement.length - 1];

    const results = [{
      total: `## ${stats.totalDOMNodes}`,
      depth: `## ${stats.depth.max}\n*path to element:*` + '```' + depthSnippet + '```',
      width: `## ${stats.width.max}\n*element with most children:*` + '```' + widthSnippet + '```'
    }];

    // Use the CDF of a log-normal distribution for scoring.
    //   < 1500ms: score≈100
    //   2000ms: score=50
    //   >= 4000ms: score≈0
    const distribution = TracingProcessor.getLogNormalDistribution(
        SCORING_MEDIAN, SCORING_POINT_OF_DIMINISHING_RETURNS);
    let score = 100 * distribution.computeComplementaryPercentile(stats.totalDOMNodes);
    // Clamp the score to 0 <= x <= 100.
    score = Math.max(0, Math.min(100, score));

    return DOMSize.generateAuditResult({
      rawValue: stats.totalDOMNodes,
      optimalValue: this.meta.optimalValue,
      score,
      displayValue: `${stats.totalDOMNodes} nodes`,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {
            total: 'Total DOM Nodes',
            depth: 'Max DOM Depth',
            width: 'Max DOM Width'
          }
        }
      }
    });
  }

}

module.exports = DOMSize;
