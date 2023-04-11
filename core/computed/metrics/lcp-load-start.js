/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {makeComputedArtifact} from '../computed-artifact.js';
import {NavigationMetric} from './navigation-metric.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LargestContentfulPaint} from './largest-contentful-paint.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {TimeToFirstByte} from './time-to-first-byte.js';
import {LCPRecord} from '../lcp-record.js';

class LCPLoadStart extends NavigationMetric {
  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {number}
   */
  static getTimestamp(record) {
    return record.networkRequestTime * 1000;
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeSimulatedMetric(data, context) {
    const processedNavigation = await ProcessedNavigation.request(data.trace, context);
    if (processedNavigation.timings.largestContentfulPaint === undefined) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP);
    }

    const lcp = await LargestContentfulPaint.request(data, context);
    const observedMetric = await this.computeObservedMetric(data, context);

    const throttleRatio = lcp.timing / processedNavigation.timings.largestContentfulPaint;
    const timing = observedMetric.timing * throttleRatio;
    return {timing};
  }

  /**
   * @param {LH.Artifacts.NavigationMetricComputationData} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.Metric>}
   */
  static async computeObservedMetric(data, context) {
    const {processedNavigation} = data;
    if (processedNavigation.timings.largestContentfulPaint === undefined) {
      throw new LighthouseError(LighthouseError.errors.NO_LCP);
    }

    const timeOriginTs = processedNavigation.timestamps.timeOrigin;

    const lcpRecord = await LCPRecord.request(data, context);
    if (!lcpRecord) {
      return TimeToFirstByte.computeObservedMetric(data, context);
    }

    const timestamp = this.getTimestamp(lcpRecord);
    const timing = (timestamp - timeOriginTs) / 1000;

    return {timing, timestamp};
  }
}

const LCPLoadStartComputed = makeComputedArtifact(
  LCPLoadStart,
  ['devtoolsLog', 'gatherContext', 'settings', 'simulator', 'trace', 'URL']
);
export {LCPLoadStartComputed as LCPLoadStart};
