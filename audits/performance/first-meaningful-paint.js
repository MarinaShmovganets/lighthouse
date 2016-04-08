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

const FMPMetric = require('../../metrics/performance/first-meaningful-paint');
const Audit = require('../audit');

class FirstMeaningfulPaint extends Audit {
  /**
   * @override
   */
  static get tags() {
    return ['Performance'];
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
    return 'Has a good first meaningful paint';
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @see  https://github.com/GoogleChrome/lighthouse/issues/26
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    return FMPMetric
        .parse(artifacts.traceContents)
        .then(fmp => {
          if (fmp.err) {
            return {
              score: -1
            };
          }

          // Roughly an exponential curve.
          // < 1000ms: penalty=0
          // 3000ms: penalty=90
          // >= 5000ms: penalty=100
          const power = (fmp.duration - 1000) * 0.001 * 0.5;
          const penalty = power > 0 ? Math.pow(10, power) : 0;
          let score = 100 - penalty;

          // Clamp the score to 0 <= x <= 100.
          score = Math.min(100, score);
          score = Math.max(0, score);

          return {
            duration: `${fmp.duration.toFixed(2)}ms`,
            score: Math.round(score)
          };
        }, _ => {
          // Recover from trace parsing failures.
          return {
            score: -1
          };
        })
        .then(result => {
          return FirstMeaningfulPaint.generateAuditResult(
              result.score, result.duration, undefined,
              this.generateRecommendedActions(result.score, artifacts)
          );
        });
  }

  /**
   * Generates some recommended actions for FMP.
   * @param {number} score The score to determine if we need to bother.
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {Array<!AuditRecommendedAction>|undefined}
   */
  static generateRecommendedActions(score, artifacts) {
    // If there is a score of 100 no further action is required.
    if (score === 100) {
      return undefined;
    }

    if (!artifacts.blockingResources) {
      return undefined;
    }

    // Attempt to figure out what the blocking resources are in the page.
    const recommendedActions = artifacts.blockingResources
        .map(resource => {
          let suggestion = '';

          switch (resource.data._resourceType._name) {
            case 'script':
              suggestion = 'should have either async or defer attribute';
              break;

            case 'stylesheet':
              suggestion = 'should be moved inline to the HTML';
              break;

            default:
              suggestion = 'should be removed';
              break;
          }

          return {
            title: `${resource.data.url} ${suggestion}`,
            details: [
              `blocks for ${(resource.data.endTime - resource.data.startTime).toFixed(2)}ms`
            ]
          };
        });

    return recommendedActions;
  }
}

module.exports = FirstMeaningfulPaint;
