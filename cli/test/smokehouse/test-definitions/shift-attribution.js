/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/shift-attribution.html',
    finalDisplayedUrl: 'http://localhost:10200/shift-attribution.html',
    audits: {
      'layout-shifts': {
        score: 0,
        details: {
          items: [
            {
              node: {selector: 'body > div#blue'},
              subItems: {items: [{cause: /iframe/}]},
            },
            {
              node: {selector: 'body > div#blue'},
              subItems: {items: [{cause: /font/}]},
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'shift-attribution',
  expectations,
};
