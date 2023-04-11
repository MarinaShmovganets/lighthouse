/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {MainResource} from '../main-resource.js';

class TimeToFirstByte extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeSimulatedMetric(data, context) {
    // It may be beneficial to perform additional calculations for simulated throttling in the future.
    // For now we should just match the server response time audit.
    return this.computeObservedMetric(data, context);
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const {processedNavigation} = data;
    const timeOriginTs = processedNavigation.timestamps.timeOrigin;
    const mainResource = await MainResource.request(data, context);

    const timestamp = mainResource.responseHeadersEndTime * 1000;
    const timing = (timestamp - timeOriginTs) / 1000;

    return {timing, timestamp};
  }
}

const TimeToFirstByteComputed = makeComputedArtifact(
  TimeToFirstByte,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {TimeToFirstByteComputed as TimeToFirstByte};
