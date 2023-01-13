/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    usePassiveGathering: true,
    onlyCategories: ['performance'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    ViewportDimensions: {
      innerWidth: 360,
      innerHeight: 640,
      outerWidth: 360,
      outerHeight: 640,
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/max-texture-size.html',
    finalDisplayedUrl: 'http://localhost:10200/max-texture-size.html',
    audits: {
      'full-page-screenshot': {
        details: {
          screenshot: {
            data: /^data:image\/webp;base64,.{50}/,
            height: 640,
            width: 360,
          },
        },
      },
    },
  },
};

export default {
  id: 'fps-max-passive',
  expectations,
  config,
};

