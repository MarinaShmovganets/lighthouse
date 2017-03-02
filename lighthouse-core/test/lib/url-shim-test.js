/**
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

/* eslint-env mocha */

const URL = require('../../lib/url-shim');
const assert = require('assert');
const superLongName =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';

describe('URL Shim', () => {
  it('handles URLs beginning with multiple digits', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1186
    const url = 'http://5321212.fls.doubleclick.net/activityi;src=5321212;type=unvsn_un;cat=unvsn_uv;ord=7762287885264.98?';
    assert.doesNotThrow(_ => new URL(url));
  });

  it('safely identifies valid URLs', () => {
    assert.ok(URL.isValid('https://5321212.fls.net/page?query=string#hash'));
    assert.ok(URL.isValid('https://localhost:8080/page?query=string#hash'));
    assert.ok(URL.isValid('https://google.co.uk/deep/page?query=string#hash'));
  });

  it('safely identifies invalid URLs', () => {
    assert.equal(URL.isValid(''), false);
    assert.equal(URL.isValid('eval(<context>):45:16'), false);
  });

  it('safely identifies same hosts', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'http://5321212.fls.net/deeply/nested/page';
    assert.ok(URL.hostsMatch(urlA, urlB));
  });

  it('safely identifies different hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'http://google.co.uk/deeply/nested/page';
    assert.equal(URL.hostsMatch(urlA, urlB), false);
  });

  it('safely identifies invalid hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'anonymous:45';
    assert.equal(URL.hostsMatch(urlA, urlB), false);
  });

  describe('getDisplayName', () => {
    it('respects numPathParts option', () => {
      const url = 'http://example.com/a/deep/nested/file.css';
      const result = URL.getDisplayName(url, {numPathParts: 3});
      assert.equal(result, '\u2026deep/nested/file.css');
    });

    it('respects preserveQuery option', () => {
      const url = 'http://example.com/file.css?aQueryString=true';
      const result = URL.getDisplayName(url, {preserveQuery: true});
      assert.equal(result, '/file.css?aQueryString=true');
    });

    it('respects preserveHost option', () => {
      const url = 'http://example.com/file.css';
      const result = URL.getDisplayName(url, {preserveHost: true});
      assert.equal(result, 'example.com/file.css');
    });

    it('Elides hashes', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = URL.getDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026.css');
    });

    it('Elides hashes in the middle', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab80378281399fb1ba670b-somethingmore.css';
      const result = URL.getDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026-somethingmore.css');
    });

    it('Elides query strings when can first parameter', () => {
      const url = 'http://example.com/file.css?aQueryString=true&other_long_query_stuff=false&some_other_super_long_query';
      const result = URL.getDisplayName(url, {preserveQuery: true});
      assert.equal(result, '/file.css?aQueryString=\u2026');
    });

    it('Elides query strings when cannot preserve first parameter', () => {
      const url = 'http://example.com/file.css?superDuperNoGoodVeryLongExtraSpecialOnlyTheBestEnourmousQueryString=true';
      const result = URL.getDisplayName(url, {preserveQuery: true});
      assert.equal(result, '/file.css?\u2026');
    });

    it('Elides long names', () => {
      const result = URL.getDisplayName(superLongName);
      const expected = '/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWe\u2026.js';
      assert.equal(result, expected);
    });

    it('Elides long names with hash', () => {
      const url = superLongName.slice(0, -3) +
          '-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = URL.getDisplayName(url);
      const expected = '/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichW\u2026.css';
      assert.equal(result, expected);
    });

    it('Doesn\'t elide short names', () => {
      const url = 'http://example.com/file.css';
      const result = URL.getDisplayName(url);
      assert.equal(result, '/file.css');
    });
  });

  describe('equalWithExcludedFragments', () => {
    it('correctly checks equality of URLs regardless of fragment', () => {
      const equalPairs = [
        ['https://example.com/', 'https://example.com/'],
        ['https://example.com/', 'https://example.com/#/login?_k=dt915a'],
        ['https://example.com/', 'https://example.com#anchor']
      ];
      equalPairs.forEach(pair => assert.ok(URL.equalWithExcludedFragments(...pair)));
    });

    it('correctly checks inequality of URLs regardless of fragment', () => {
      const unequalPairs = [
        ['https://example.com/', 'https://www.example.com/'],
        ['https://example.com/', 'http://example.com/'],
        ['https://example.com/#/login?_k=dt915a', 'https://example.com/index.html#/login?_k=dt915a'],
        ['https://example.com#anchor', 'https://example.com?t=1#anchor']
      ];
      unequalPairs.forEach(pair => assert.ok(!URL.equalWithExcludedFragments(...pair)));
    });
  });
});
