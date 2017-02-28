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
const URL = (typeof self !== 'undefined' && self.URL) || require('whatwg-url').URL;

URL.INVALID_URL_DEBUG_STRING =
    'Lighthouse was unable to determine the URL of some script executions. ' +
    'It\'s possible a Chrome extension or other eval\'d code is the source.';

/**
 * @param {string} url
 * @return {boolean}
 */
URL.isValid = function isValid(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * @param {string} urlA
 * @param {string} urlB
 * @return {boolean}
 */
URL.hostsMatch = function hostsMatch(urlA, urlB) {
  try {
    return new URL(urlA).host === new URL(urlB).host;
  } catch (e) {
    return false;
  }
};

/**
 * @param {string} url
 * @param {{numPathParts: number, removeQuery: boolean, removeHost: boolean}=} options
 * @return {string}
 */
URL.getDisplayName = function getDisplayName(url, options) {
  options = Object.assign({
    numPathParts: 2,
    removeQuery: true,
    removeHost: true,
  }, options);

  const parsed = new URL(url);

  let name;

  if (parsed.protocol === 'about:' || parsed.protocol === 'data:') {
    // Handle 'about:*' and 'data:*' URLs specially since they have no path.
    name = parsed.href;
  } else {
    name = parsed.pathname;
    const parts = name.split('/');
    if (options.numPathParts && parts.length > options.numPathParts) {
      name = '\u2026' + parts.slice(-1 * options.numPathParts).join('/');
    }

    if (!options.removeHost) {
      name = `${parsed.host}/${name.replace(/^\//, '')}`;
    }
    if (!options.removeQuery) {
      name = `${name}${parsed.search}`;
    }
  }

  const MAX_LENGTH = 64;
  // Always elide hash
  name = name.replace(/([a-f0-9]{7})[a-f0-9]{13}[a-f0-9]*/g, '$1\u2026');

  // Elide query params first
  if (name.length > MAX_LENGTH && name.includes('?')) {
    // Try to leave the first query parameter intact
    name = name.replace(/\?([^=]*)(=)?.*/, '?$1$2\u2026');

    // Remove it all if it's still too long
    if (name.length > MAX_LENGTH) {
      name = name.replace(/\?.*/, '?\u2026');
    }
  }

  // Elide too long names next
  if (name.length > MAX_LENGTH) {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex >= 0) {
      name = name.slice(0, MAX_LENGTH - 1 - (name.length - dotIndex)) +
          // Show file extension
          `\u2026${name.slice(dotIndex)}`;
    } else {
      name = name.slice(0, MAX_LENGTH - 1) + '\u2026';
    }
  }

  return name;
};

/**
 * Determine if url1 equals url2, ignoring URL fragments.
 * @param {string} url1
 * @param {string} url2
 * @return {boolean}
 */
URL.equalWithExcludedFragments = function(url1, url2) {
  url1 = new URL(url1);
  url1.hash = '';

  url2 = new URL(url2);
  url2.hash = '';

  return url1.href === url2.href;
};

module.exports = URL;
