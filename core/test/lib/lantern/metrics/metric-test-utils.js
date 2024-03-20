/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getComputationDataParams} from '../../../../computed/metrics/lantern-metric.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {LH.Trace} trace
 * @param {LH.DevtoolsLog} devtoolsLog
 * @param {LH.Artifacts.URL=} URL
 */
function getComputationDataFromFixture(trace, devtoolsLog, URL = null) {
  const gatherContext = {gatherMode: 'navigation'};
  const settings = {};
  const context = {settings, computedCache: new Map()};
  URL = URL || getURLArtifactFromDevtoolsLog(devtoolsLog);
  return getComputationDataParams({trace, devtoolsLog, gatherContext, settings, URL}, context);
}

export {getComputationDataFromFixture};
