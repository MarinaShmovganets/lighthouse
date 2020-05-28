/**
 * @license Copyright 2020 Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @param {LH.Result} lhr @param {string} auditName */
const getNumericValue = (lhr, auditName) =>
  (lhr.audits[auditName] && lhr.audits[auditName].numericValue) || NaN;

/**
 * @param {LH.Result} lhr
 * @param {number} medianFcp
 * @param {number} medianInteractive
 */
function getMedianSortValue(lhr, medianFcp, medianInteractive) {
  const distanceFcp = medianFcp - getNumericValue(lhr, 'first-contentful-paint');
  const distanceInteractive =
    medianInteractive - getNumericValue(lhr, 'interactive');

  return distanceFcp * distanceFcp + distanceInteractive * distanceInteractive;
}

/**
 * We want the run that's closest to the median of the FCP and the median of the TTI. 
 * We're using the Euclidean distance for that (https://en.wikipedia.org/wiki/Euclidean_distance).
 * @param {Array<LH.Result>} runs
 * @return {LH.Result|undefined}
 */
function computeMedianRun(runs) {
  const validRuns = runs
    .filter(run => Number.isFinite(getNumericValue(run, 'first-contentful-paint')))
    .filter(run => Number.isFinite(getNumericValue(run, 'interactive')));
  if (!validRuns.length) return undefined;

  const sortedByFcp = validRuns
    .slice()
    .sort(
      (a, b) =>
        getNumericValue(a, 'first-contentful-paint') -
        getNumericValue(b, 'first-contentful-paint')
    );
  const medianFcp = getNumericValue(
    sortedByFcp[Math.floor(validRuns.length / 2)],
    'first-contentful-paint'
  );

  const sortedByInteractive = validRuns
    .slice()
    .sort(
      (a, b) =>
        getNumericValue(a, 'interactive') - getNumericValue(b, 'interactive')
    );
  const medianInteractive = getNumericValue(
    sortedByInteractive[Math.floor(validRuns.length / 2)],
    'interactive'
  );

  const sortedByProximityToMedian = validRuns
    .slice()
    .sort(
      (a, b) =>
        getMedianSortValue(a, medianFcp, medianInteractive) -
        getMedianSortValue(b, medianFcp, medianInteractive)
    );

  return sortedByProximityToMedian[0];
}

module.exports = {computeMedianRun};
