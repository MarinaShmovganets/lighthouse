/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @type {LH.Config.Json} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    ViewportDimensions: {
      innerWidth: 980,
      // This value can vary slightly, depending on the display.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=1346355
      innerHeight: '1742 +/- 1',
      outerWidth: 360,
      outerHeight: 640,
      // In DevTools this value will be exactly 3.
      devicePixelRatio: '2.625 +/- 1',
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/scaled-content.html',
    finalUrl: 'http://localhost:10200/scaled-content.html',
    audits: {
      'full-page-screenshot': {
        details: {
          nodes: {
            'page-0-BODY': {
              top: 0,
              bottom: 1742,
              left: 0,
              right: 980,
              width: 980,
              height: 1742,
            },
          },
          screenshot: {
            height: 1742,
            width: 980,
          },
        },
      },
    },
  },
};

export default {
  id: 'fps-scaled',
  expectations,
  config,
};

