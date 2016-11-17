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

/**
 * @fileoverview Audit a page to see if it does not use sync <script> in <head>
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class ScriptBlockingFirstPaint extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'script-blocking-first-paint',
      description: 'Site does not use <script> in head that delays first paint',
      helpText: '&lt;script> elements are <a href="https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp" target="_blank">delaying the first paint</a> of your page! Consider inlining or adding <code>async</code> or <code>defer</code> attributes.',
      requiredArtifacts: ['ScriptsBlockingFirstPaint']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const artifact = artifacts.ScriptsBlockingFirstPaint;
    if (typeof artifact === 'undefined' || artifact.value === -1) {
      return ScriptBlockingFirstPaint.generateAuditResult({
        rawValue: false,
        debugString: 'ScriptsBlockingFirstPaint gatherer did not run'
      });
    }

    const results = artifact.items.map(item => {
      return {
        url: item.script.src,
        label: `delayed first paint by ${item.spendTime}ms`
      };
    });

    let displayValue = '';
    const totalSpendTime = artifact.total.spendTime;
    if (results.length > 1) {
      displayValue = `${results.length} resources delayed first paint by ${totalSpendTime}ms`;
    } else if (results.length === 1) {
      displayValue = `${results.length} resource delayed first paint by ${totalSpendTime}ms`;
    }

    return ScriptBlockingFirstPaint.generateAuditResult({
      displayValue,
      rawValue: artifact.items.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = ScriptBlockingFirstPaint;
