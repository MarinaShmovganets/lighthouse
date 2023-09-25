/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    precomputedLanternData: {
      additionalRttByOrigin: {
        'http://localhost:10200': 500,
      },
      serverResponseTimeByOrigin: {
        'http://localhost:10200': 1000,
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/tricky-main-thread.html?fetch',
    finalDisplayedUrl: 'http://localhost:10200/tricky-main-thread.html?fetch',
    audits: {
      'interactive': {
        // Make sure all of the CPU time is reflected in the perf metrics as well.
        // The scripts stalls for 3 seconds and lantern has a 4x multiplier so 12s minimum.
        numericValue: '>12000',
      },
      'bootup-time': {
        details: {
          items: {
            0: {
            // TODO: requires sampling profiler and async stacks, see https://github.com/GoogleChrome/lighthouse/issues/8526
            // url: /main-thread-consumer/,
              scripting: '>1000',
            },
          },
        },
      },
    },
  },
};

export default {
  id: 'lantern-fetch',
  expectations,
  config,
};
