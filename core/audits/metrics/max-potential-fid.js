/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import {MaxPotentialFID as ComputedFid} from '../../computed/metrics/max-potential-fid.js';
import {ProcessedTrace} from '../../computed/processed-trace.js';
import {ProcessedNavigation} from '../../computed/processed-navigation.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Description of the Maximum Potential First Input Delay metric that marks the maximum estimated time between the page receiving input (a user clicking, tapping, or typing) and the page responding. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The maximum potential First Input Delay that your users could experience is the ' +
      'duration of the longest task. ' +
      '[Learn more about the Maximum Potential First Input Delay metric](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-max-potential-fid/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @fileoverview This metric is the duration of the longest task after FCP. It is meant to capture
 * the worst case First Input Delay that a user might experience.
 * Tasks before FCP are excluded because it is unlikely that the user will try to interact with a page before it has painted anything.
 */
class MaxPotentialFID extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'max-potential-fid',
      title: str_(i18n.UIStrings.maxPotentialFIDMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      supportedModes: ['navigation'],
      requiredArtifacts: ['traces', 'devtoolsLogs', 'GatherContext', 'URL'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/onxmbblyqo
      p10: 130,
      median: 250,
    };
  }

  /**
   * Extract potential LoAF replacements for MPFID from the trace to log in
   * debugdata details.
   * @param {LH.Artifacts.ProcessedTrace} processedTrace
   * @param {LH.Artifacts.ProcessedNavigation} processedNavigation
   * @return {{type: 'debugdata', observedMaxDurationLoaf: LH.TraceEvent, observedMaxBlockingLoaf: LH.TraceEvent}|undefined}
   */
  static getLongAnimationFrameDetails(processedTrace, processedNavigation) {
    const {firstContentfulPaint} = processedNavigation.timestamps;
    const loafs = processedTrace.mainThreadEvents.filter(evt => {
      return evt.name === 'LongAnimationFrame' &&
          evt.ph === 'b' &&
          evt.ts >= firstContentfulPaint;
    });

    let currentMaxDuration = -Infinity;
    let currentMaxDurationLoaf;
    let currentMaxBlocking = -Infinity;
    let currentMaxBlockingLoaf;

    for (const loaf of loafs) {
      const loafDuration = loaf.args?.data?.duration;
      const loafBlocking = loaf.args?.data?.blockingDuration;
      // Should never happen, so mostly keeping the type checker happy.
      if (loafDuration === undefined || loafBlocking === undefined) continue;

      if (loafDuration > currentMaxDuration) {
        currentMaxDuration = loafDuration;
        currentMaxDurationLoaf = loaf;
      }
      if (loafBlocking > currentMaxBlocking) {
        currentMaxBlocking = loafBlocking;
        currentMaxBlockingLoaf = loaf;
      }
    }

    if (!currentMaxDurationLoaf || !currentMaxBlockingLoaf) return;

    return {
      type: 'debugdata',
      observedMaxDurationLoaf: currentMaxDurationLoaf,
      observedMaxBlockingLoaf: currentMaxBlockingLoaf,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const gatherContext = artifacts.GatherContext;
    const metricComputationData = {trace, devtoolsLog, gatherContext,
      settings: context.settings, URL: artifacts.URL};
    const metricResult = await ComputedFid.request(metricComputationData, context);

    const processedTrace = await ProcessedTrace.request(trace, context);
    const processedNavigation = await ProcessedNavigation.request(trace, context);
    const details = MaxPotentialFID.getLongAnimationFrameDetails(processedTrace,
        processedNavigation);

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        metricResult.timing
      ),
      numericValue: metricResult.timing,
      numericUnit: 'millisecond',
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: metricResult.timing}),
      details,
    };
  }
}

export default MaxPotentialFID;
export {UIStrings};
