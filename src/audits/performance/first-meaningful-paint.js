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

// Parameters for log-normal CDF scoring. To see the curve:
// https://www.desmos.com/calculator/r7t7qfaaih
const SCORE_LOCATION = Math.log(4000);
const SCORE_SHAPE = 0.5;

class FirstMeaningfulPaint extends Audit {
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
    return 'first-meaningful-paint';
  }

  /**
   * @override
   */
  static get description() {
    return 'First meaningful paint';
  }

  /**
   * @override
   */
  static get optimalValue() {
    return '1,000ms';
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @see https://github.com/GoogleChrome/lighthouse/issues/26
   * @see https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/view
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const traceData = artifacts.traceContents;
    return FMPMetric.parse(traceData).then(data => {
      // there are a few candidates for fMP:
      // * firstContentfulPaint: the first time that text or image content was painted.
      // * fMP basic: paint after most significant layout
      // * fMP page height: basic + scaling sigificance to page height
      // * fMP webfont: basic + waiting for in-flight webfonts to paint
      // * fMP full: considerig both page height + webfont heuristics

      // We're interested in the last of these
      const lastfMPts = data.fmpCandidates
        .map(e => e.ts)
        .reduce((mx, c) => Math.max(mx, c));

      // First meaningful paint (following most significant layout)
      const firstMeaningfulPaint = (lastfMPts - data.navStart.ts) / 1000;

      // Use the CDF of a log-normal distribution for scoring.
      //   < 1100ms: score≈100
      //   4000ms: score≈50
      //   >= 14000ms: score≈0
      const distribution =
          TracingProcessor.getLogNormalDistribution(SCORE_LOCATION, SCORE_SHAPE);
      let score = 100 * distribution.computeComplementaryPercentile(firstMeaningfulPaint);

      return {
        duration: `${firstMeaningfulPaint.toFixed(2)}ms`,
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
      return FirstMeaningfulPaint.generateAuditResult({
        value: result.score,
        rawValue: result.duration,
        debugString: result.debugString,
        optimalValue: this.optimalValue
      });
    });
  }
}

module.exports = FirstMeaningfulPaint;
