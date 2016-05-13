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

      // Roughly an exponential curve.
      //   < 1000ms: penalty=0
      //   3000ms: penalty=90
      //   >= 5000ms: penalty=100
      const power = (firstMeaningfulPaint - 1000) * 0.001 * 0.5;
      const penalty = power > 0 ? Math.pow(10, power) : 0;
      let score = 100 - penalty;

      // Clamp the score to 0 <= x <= 100.
      score = Math.min(100, score);
      score = Math.max(0, score);

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
