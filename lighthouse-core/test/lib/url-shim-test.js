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

describe('URL Shim', () => {
  it('handles URLs beginning with multiple digits', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1186
    const url = 'http://5321212.fls.doubleclick.net/activityi;src=5321212;type=unvsn_un;cat=unvsn_uv;ord=7762287885264.98?';
    assert.doesNotThrow(_ => new URL(url));
  });

  it('safely identifies same hosts', () => {
    const url = 'https://5321212.fls.net/page?query=string#hash';
    const host = '5321212.fls.net';
    assert.equal(URL.hostMatches(url, host), true);
  });

  it('safely identifies different hosts', () => {
    const url = 'https://www.google.com/page?query=string#hash';
    const host = 'google.co.uk';
    assert.equal(URL.hostMatches(url, host), false);
  });

  it('safely identifies host similarity with fallback', () => {
    let myVar;
    const url = 'eval(<context>):64:15';
    const myFallback = (err, failedUrl) => {
      assert.ok(err);
      assert.equal(failedUrl, url);
      return myVar = 'debug string';
    };

    assert.equal(URL.hostMatches(url, 'ignored', false), false);
    assert.equal(URL.hostMatches(url, 'ignored', myFallback), true);
    assert.equal(myVar, 'debug string');
  });
});
