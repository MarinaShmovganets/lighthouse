/**
 * @license
 * Copyright 2018 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const perfConfig = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    onlyCategories: ['performance'],
  },
};

export default perfConfig;
