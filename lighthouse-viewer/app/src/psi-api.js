/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{lighthouseResult?: LH.Result, error?: {message: string}}} PSIResponse */

const PSI_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_KEY = 'AIzaSyAjcDRNN9CX9dCazhqI4lGR7yyQbkd_oYE';
const PSI_DEFAULT_CATEGORIES = [
  'performance',
  'accessibility',
  'seo',
  'best-practices',
  'pwa',
];

/**
 * Wrapper around the PSI API for fetching LHR.
 */
class PSIApi {
  /**
   * @param {PSIParams} params
   * @return {Promise<PSIResponse>}
   */
  fetchPSI(params) {
    const apiUrl = new URL(PSI_URL);
    for (const kv of Object.entries(params)) {
      const name = kv[0];
      let value = kv[1];

      if (name === 'category') continue;
      if (name === 'strategy') value = value || 'mobile';
      if (typeof value !== 'undefined') apiUrl.searchParams.append(name, value);
    }
    for (const singleCategory of (params.category || PSI_DEFAULT_CATEGORIES)) {
      apiUrl.searchParams.append('category', singleCategory);
    }
    apiUrl.searchParams.append('key', PSI_KEY);
    return fetch(apiUrl.href).then(res => res.json());
  }
}

// node export for testing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PSIApi;
  module.exports.PSI_DEFAULT_CATEGORIES = PSI_DEFAULT_CATEGORIES;
}
