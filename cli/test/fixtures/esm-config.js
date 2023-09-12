/**
 * @license
 * Copyright 2017 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Config file for running PWA smokehouse audits for axe.
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'accessibility',
    ],
  },
};

export default config;
