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
 * URL shim so we keep our code DRY
 */

'use strict';

/* global self */

// TODO: Add back node require('url').URL parsing when bug is resolved:
// https://github.com/GoogleChrome/lighthouse/issues/1186
const URL = module.exports = (typeof self !== 'undefined' && self.URL) || require('whatwg-url').URL;

/**
 * Safely checks if the host of a URL matches a known host with a specified
 * fallback in case of error.
 *
 * @param {string} url
 * @param {string} host
 * @param {boolean|function=} fallback
 * @return {boolean}
 */
module.exports.hostMatches = function(url, host, fallback) {
  try {
    return new URL(url).host === host;
  } catch (err) {
    let result = fallback;
    if (typeof fallback === 'function') {
      result = fallback(err, url);
    }

    return Boolean(result);
  }
};
