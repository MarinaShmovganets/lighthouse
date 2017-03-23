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
'use strict';

class ReportGeneratorV2 {
  /**
   * Computes the weighted-average of the score of the list of items.
   * @param {!Array<{score: number=, weight: number=}} items
   * @return {number}
   */
  static arithmeticMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        sum: result.sum + score * weight,
      };
    }, {weight: 0, sum: 0});

    return (results.sum / results.weight) || 0;
  }

  /**
   * Returns the report JSON object with computed scores.
   * @param {{categories: !Object<{audits: !Array}>}} config
   * @param {!Object<{score: number|boolean}>} resultsByAuditId
   * @return {{categories: !Array<{audits: !Array<{score: number, result: !Object}>}>}}
   */
  generateReportJson(config, resultsByAuditId) {
    const categories = Object.keys(config.categories).map(categoryId => {
      const category = config.categories[categoryId];
      category.id = categoryId;

      const audits = category.audits.map(audit => {
        const result = resultsByAuditId[audit.id];
        let score = Number(result.score) || 0;
        if (typeof result.score === 'boolean') {
          score = result.score ? 100 : 0;
        }

        return Object.assign({}, audit, {result, score});
      });

      const score = ReportGeneratorV2.arithmeticMean(audits);
      return Object.assign({}, category, {audits, score});
    });

    return {categories};
  }
}

module.exports = ReportGeneratorV2;
