/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const FMPMetric = require('../../metrics/first-meaningful-paint');
const Audit = require('../audit');
const TracingProcessor = require('../../lib/traces/tracing-processor');

const SCORE_LOCATION = 8.3;
const SCORE_SHAPE = 0.5;

class FirstContentfulPaint extends Audit {
  /**
   * @override
   */
  static get category() {
    return 'Performance';
  }

  /**
   * @override
   */
  static get name() {
    return 'first-contentful-paint';
  }

  /**
   * @override
   */
  static get description() {
    return 'First paint of content';
  }

  /**
   * @override
   */
  static get optimalValue() {
    return '1,000ms';
  }

  /**
   * Audits the page to give a score for First Contentful Paint.
   * @see  https://github.com/GoogleChrome/lighthouse/issues/26
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    return FMPMetric.parse(artifacts.traceContents)
        .then(fmp => {
          // The fundamental Time To fMP metric
          const firstContentfulPaint = fmp.firstMeaningfulPaint - fmp.navigationStart;

          // Use the CDF of a log-normal distribution for scoring.
          //   < 1100ms: score≈100
          //   4000ms: score≈50
          //   >= 14000ms: score≈0
          const distribution =
              TracingProcessor.getLogNormalDistribution(SCORE_LOCATION, SCORE_SHAPE);
          let score = 100 * distribution.computeComplementaryPercentile(firstContentfulPaint);

          // Clamp the score to 0 <= x <= 100.
          score = Math.min(100, score);
          score = Math.max(0, score);

          return {
            duration: `${firstContentfulPaint.toFixed(2)}ms`,
            score: Math.round(score)
          };
        }).catch(err => {
          // Recover from trace parsing failures.
          return {
            score: -1,
            debugString: err.message
          };
        })
        .then(result => {
          return FirstContentfulPaint.generateAuditResult({
            value: result.score,
            rawValue: result.duration,
            debugString: result.debugString,
            optimalValue: this.optimalValue
          });
        });
  }
}

module.exports = FirstContentfulPaint;
