/**
 * @license
 * Copyright 2019 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import {CumulativeLayoutShift as ComputedCLS} from '../../computed/metrics/cumulative-layout-shift.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Description of the Cumulative Layout Shift metric that indicates how much the page changes its layout while it loads. If big segments of the page shift their location during load, the Cumulative Layout Shift will be higher. This description is displayed within a tooltip when the user hovers on the metric name to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Cumulative Layout Shift measures the movement of visible ' +
               'elements within the viewport. ' +
               '[Learn more about the Cumulative Layout Shift metric](https://web.dev/cls/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @fileoverview This metric represents the amount of visual shifting of DOM elements during page load.
 */
class CumulativeLayoutShift extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'cumulative-layout-shift',
      title: str_(i18n.UIStrings.cumulativeLayoutShiftMetric),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // https://web.dev/cls/#what-is-a-good-cls-score
      // This 0.1 target score was determined through both manual evaluation and large-scale analysis.
      // see https://www.desmos.com/calculator/ksp7q91nop
      p10: 0.1,
      median: 0.25,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const {cumulativeLayoutShift, ...rest} = await ComputedCLS.request(trace, context);

    /** @type {LH.Audit.Details.DebugData} */
    const details = {
      type: 'debugdata',
      items: [rest],
    };

    return {
      score: Audit.computeLogNormalScore(
        {p10: context.options.p10, median: context.options.median},
        cumulativeLayoutShift
      ),
      numericValue: cumulativeLayoutShift,
      numericUnit: 'unitless',
      displayValue: cumulativeLayoutShift.toLocaleString(context.settings.locale),
      details,
    };
  }
}

export default CumulativeLayoutShift;
export {UIStrings};
