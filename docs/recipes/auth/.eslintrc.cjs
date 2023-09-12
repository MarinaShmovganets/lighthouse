/**
 * @license
 * Copyright 2019 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

module.exports = {
  extends: '../../../.eslintrc.cjs',
  env: {
    mocha: true,
  },
  globals: {
    expect: true,
  },
  rules: {
    'new-cap': 0,
    'no-console': 0,
    'no-unused-vars': 0,
  },
};
