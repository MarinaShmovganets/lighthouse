/**
 * @license
 * Copyright 2020 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../types/lh.js';
import * as constants from './constants.js';

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: constants.throttling.desktopDense4G,
    screenEmulation: constants.screenEmulationMetrics.desktop,
    emulatedUserAgent: constants.userAgents.desktop,
  },
};

export default config;
