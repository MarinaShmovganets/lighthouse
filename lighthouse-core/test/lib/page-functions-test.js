/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require( '../../lib/url-shim' );
const DOM = require('../../report/html/renderer/dom.js');
const Util = require('../../report/html/renderer/util.js');
const pageFunctions = require('../../lib/page-functions');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../report/html/templates.html', 'utf8');

/* eslint-env jest */

describe('DetailsRenderer', () => {
  let dom;

  beforeAll(() => {
    global.URL = URL;
    global.Util = Util;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    dom = new DOM(document);
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
  });

  describe('get outer HTML snippets', () => {
    it('gets full HTML snippet', () => {
      const snippet = pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'})
      );
      assert.ok(snippet.includes('div') &&
        snippet.includes('id="1"') &&
        snippet.includes('style="style"')
      );
    });

    it('removes a specific attribute', () => {
      const snippet = pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'}),
        ['style']
      );
      assert.ok(snippet.includes('div') &&
        snippet.includes('id="1"') &&
        !snippet.includes('style="style"')
      );
    });

    it('removes multiple attributes', () => {
      const snippet = pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style', 'aria-label']
      );
      assert.ok(snippet.includes('div') &&
        snippet.includes('id="1"') &&
        !snippet.includes('style="style"') &&
        !snippet.includes('aria-label="label"')
      );
    });

    it('ignores when attribute not found', () => {
      const snippet = pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style-missing', 'aria-label-missing']
      );
      assert.ok(snippet.includes('div') &&
        snippet.includes('id="1"') &&
        snippet.includes('style="style"') &&
        snippet.includes('aria-label="label"')
      );
    });
  });
});
