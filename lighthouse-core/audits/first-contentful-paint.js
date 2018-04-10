/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util.js');

// eslint-disable-next-line max-len
const LEARN_MORE_LINK = 'https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#first_paint_and_first_contentful_paint';

class FirstContentfulPaint extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'first-contentful-paint',
      description: 'First Contentful Paint',
      helpText: 'First contentful paint marks the time at which the first text/image is painted. ' +
          `[Learn more](${LEARN_MORE_LINK}).`,
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/joz3pqttdq
      scorePODR: 1600,
      scoreMedian: 4000,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {!Promise<!AuditResult>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};
    const metricResult = await artifacts.requestFirstContentfulPaint(metricComputationData);

    return {
      score: Audit.computeLogNormalScore(
        metricResult.timing,
        context.options.scorePODR,
        context.options.scoreMedian
      ),
      rawValue: metricResult.timing,
      displayValue: Util.formatMilliseconds(metricResult.timing),
    };
  }
}

module.exports = FirstContentfulPaint;
