/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* globals self DOM PerformanceCategoryRenderer Util DetailsRenderer */

class PSI {
  /**
   * Returns all the elements that PSI needs to render the report
   * We keep expose this helper method to minimize the 'public' API surface of the renderer
   * and allow us to refactor without two-sided patches.
   *
   *   const {scoreGaugeEl, perfCategoryEl, finalScreenshotDataUri} = PSI.prepareLabData(
   *      LHresponseJsonString,
   *      document
   *   );
   *
   * @param {string} LHresponseJsonString
   * @param {Document} document
   * @return {{scoreGaugeEl: Element, perfCategoryEl: Element, finalScreenshotDataUri: string|null}}
   */
  static prepareLabData(LHresponseJsonString, document) {
    const lhResult = /** @type {LH.Result} */ JSON.parse(LHresponseJsonString);
    const dom = new DOM(document);

    const reportLHR = Util.prepareReportResult(lhResult);
    const perfCategory = reportLHR.reportCategories.find(cat => cat.id === 'performance');
    if (!perfCategory) throw new Error(`No performance category. Can't make lab data section`);
    if (!reportLHR.categoryGroups) throw new Error(`No category groups found.`);

    const perfRenderer = new PerformanceCategoryRenderer(dom, new DetailsRenderer(dom));
    const perfCategoryEl = perfRenderer.render(perfCategory, reportLHR.categoryGroups);

    const scoreGaugeEl = dom.find('.lh-score__gauge', perfCategoryEl);
    const scoreGaugeWrapper = dom.find('.lh-gauge__wrapper', scoreGaugeEl);
    scoreGaugeWrapper.classList.add('lh-gauge__wrapper--huge');
    // Remove Performance category title/description
    dom.find('.lh-category-header', perfCategoryEl).remove();
    // Remove navigation links
    scoreGaugeWrapper.removeAttribute('href');
    dom.find('.lh-permalink', perfCategoryEl).remove();

    const finalScreenshotDataUri = Util.getFinalScreenshot(perfCategory);
    return {scoreGaugeEl, perfCategoryEl, finalScreenshotDataUri};
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSI;
} else {
  self.PSI = PSI;
}
