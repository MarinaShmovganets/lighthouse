/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Config used for generating the sample_v2 golden LHR.
 */

/** @type {LH.Config} */
const budgetedConfig = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
  },
};

export default budgetedConfig;
