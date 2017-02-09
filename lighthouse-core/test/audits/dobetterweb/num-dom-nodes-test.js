/**
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

const NumDOMNodes = require('../../../audits/dobetterweb/num-dom-nodes.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Num DOM nodes audit', () => {
  it('fails when num DOM nodes is too high', () => {
    const numNodes = NumDOMNodes.MAX_DOM_NODES + 1;
    const auditResult = NumDOMNodes.audit({
      AllDOMNodes: Array(numNodes),
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.displayValue, `${numNodes} elements`);
  });

  it('passes when num DOM nodes is small', () => {
    const auditResult = NumDOMNodes.audit({
      AllDOMNodes: [{}, {}]
    });
    assert.equal(auditResult.rawValue, true);
    assert.ok(!auditResult.displayValue);
  });
});
