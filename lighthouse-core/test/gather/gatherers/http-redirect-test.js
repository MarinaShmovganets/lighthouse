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

const HTTPRedirectGather = require('../../../gather/gatherers/http-redirect');
const assert = require('assert');
let httpRedirectGather;

describe('HTTP Redirect gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    httpRedirectGather = new HTTPRedirectGather();
  });
  it('sets the URL to HTTP', () => {
    const opts = {
      url: 'https://example.com'
    };
    httpRedirectGather.beforePass(opts);
    return assert.equal(opts.url, 'http://example.com');
  });
});
