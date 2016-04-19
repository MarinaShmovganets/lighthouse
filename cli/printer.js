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

'use strict';

const Printer = {
  /**
   * @param {{info: function(...)}} debugLog
   * @param {{log: function(...)}} output
   * @param {!Object} results
   */
  json: function(debugLog, output, results) {
    const url = results.url;
    const aggregations = results.aggregations;

    debugLog.info('\n\n\nLighthouse results (JSON):', url);
    output.log(JSON.stringify(aggregations, null, 2));
  },

  /**
   * @param {{info: function(...)}} debugLog
   * @param {{log: function(...)}} output
   * @param {!Object} results
   */
  prettyPrint: function(debugLog, output, results) {
    const url = results.url;
    const aggregations = results.aggregations;

    debugLog.info('\n\n\nLighthouse results:', url);

    // TODO: colorise
    aggregations.forEach(item => {
      let score = (item.score.overall * 100).toFixed(0);
      output.log(`${item.name}: ${score}%`);

      item.score.subItems.forEach(subitem => {
        let lineItem = ` -- ${subitem.description}: ${subitem.value}`;
        if (subitem.rawValue) {
          lineItem += ` (${subitem.rawValue})`;
        }
        output.log(lineItem);
        if (subitem.debugString) {
          output.log(`    ${subitem.debugString}`);
        }
      });

      output.log('');
    });
  }
};

module.exports = Printer;
