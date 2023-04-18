/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview
 * Expected Lighthouse audit values for tricky metrics tests that previously failed to be computed.
 * We only place lower bounds because we are checking that these metrics *can* be computed and that
 * we wait long enough to compute them. Upper bounds aren't very helpful here and tend to cause flaky failures.
 */

/**
 * A config with no throttling used for tricky-metrics tests.
 * Those class of tricky metrics need to use observed metrics and DevTools throttling has too many bugs
 * to capture the nuances we're testing.
 * @type {LH.Config}
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'provided',
    onlyCategories: ['performance'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/delayed-lcp.html',
    finalDisplayedUrl: 'http://localhost:10200/delayed-lcp.html',
    audits: {
      'largest-contentful-paint': {
        // LCP is after the ~7s XHR and the ~7s image.
        numericValue: '>14000',
      },
      'metrics': {
        details: {items: {0: {
          timeToFirstByte: '<100',
          lcpLoadStart: '7000+/-500',
          lcpLoadEnd: '14000+/-500',
        }}},
      },
    },
  },
};

export default {
  id: 'metrics-delayed-lcp',
  expectations,
  config,
};
