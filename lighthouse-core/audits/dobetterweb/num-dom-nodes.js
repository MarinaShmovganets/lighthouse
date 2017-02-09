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

class NumDOMNodes extends Audit {
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
      description: 'Uses a small number of DOM nodes',
      helpText: 'Browser engineers recommend pages contain fewer than ' +
          `~${NumDOMNodes.MAX_DOM_NODES} DOM nodes. The sweet spot is around 60 elements wide x ` +
          '32 elements deep. A large DOM can increase memory, cause longer ' +
          '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
          'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn more](https://developers.google.com/web/fundamentals/performance/rendering/).',
      requiredArtifacts: ['AllDOMNodes']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const nodes = artifacts.AllDOMNodes;

    const rawValue = nodes.length <= NumDOMNodes.MAX_DOM_NODES;
    const displayValue = rawValue ? '' : `${nodes.length} elements`;

    return NumDOMNodes.generateAuditResult({
      rawValue,
      displayValue
    });
  }

}

module.exports = NumDOMNodes;
