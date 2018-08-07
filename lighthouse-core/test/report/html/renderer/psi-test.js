/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');

const jsdom = require('jsdom');

const URL = require('../../../../lib/url-shim');
const PSI = require('../../../../report/html/renderer/psi.js');
const Util = require('../../../../report/html/renderer/util.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const CategoryRenderer =
    require('../../../../report/html/renderer/category-renderer');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer');
const CriticalRequestChainRenderer =
    require('../../../../report/html/renderer/crc-details-renderer');

const sampleResultsStr = fs.readFileSync(__dirname + '/../../../results/sample_v2.json', 'utf-8');
const TEMPLATE_FILE = fs.readFileSync(__dirname +
  '/../../../../report/html/templates.html', 'utf8');

/* eslint-env jest */

describe('DOM', () => {
  let document;
  beforeAll(() => {
    global.URL = URL; // do i need to do this?
    global.Util = Util;
    global.DOM = DOM;
    global.CategoryRenderer = CategoryRenderer;
    global.DetailsRenderer = DetailsRenderer;

    // Delayed so that CategoryRenderer is in global scope
    const PerformanceCategoryRenderer =
        require('../../../../report/html/renderer/performance-category-renderer');
    global.PerformanceCategoryRenderer = PerformanceCategoryRenderer;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    document = jsdom.jsdom(TEMPLATE_FILE);
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
    global.DOM = undefined;
    global.CategoryRenderer = undefined;
    global.DetailsRenderer = undefined;
    global.PerformanceCategoryRenderer = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  describe('psi prepareLabData helper', () => {
    it('reports expected data', () => {
      const result = PSI.prepareLabData(sampleResultsStr, document);
      assert.ok(result.scoreGaugeEl instanceof document.defaultView.Element);
      assert.ok(result.perfCategoryEl instanceof document.defaultView.Element);
      assert.equal(typeof result.finalScreenshotDataUri, 'string');

      assert.ok(result.finalScreenshotDataUri.startsWith('data:image/jpeg;base64,'));
      assert.ok(result.scoreGaugeEl.outerHTML.includes('<style>'), 'score gauge comes with CSS');
      assert.ok(result.scoreGaugeEl.outerHTML.includes('<svg'), 'score gauge comes with SVG');
      assert.ok(result.perfCategoryEl.outerHTML.length > 50000, 'perfCategory HTML is populated');
    });
  });
});
