#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const path = require('path');

const GOOD_ABSOLUTE_THRESHOLD = 0.2;
const OK_ABSOLUTE_THRESHOLD = 0.5;

const GOOD_RANK_THRESHOLD = 0.1;

if (!process.argv[2]) throw new Error('Usage $0 <computed summary file>');

const COMPUTATIONS_PATH = path.resolve(process.cwd(), process.argv[2]);
/** @type {{sites: LanternSiteDefinition[]}} */
const expectations = require(COMPUTATIONS_PATH);

const entries = expectations.sites.filter(site => site.lantern);

if (!entries.length) {
  throw new Error('No lantern metrics available, did you run run-all-expectations.js');
}

/** @type {LanternSiteDefinition[]} */
const totalGood = [];
/** @type {LanternSiteDefinition[]} */
const totalOk = [];
/** @type {LanternSiteDefinition[]} */
const totalBad = [];

/**
 * @param {string} metric
 * @param {string} lanternMetric
 */
function evaluateBuckets(metric, lanternMetric) {
  const good = [];
  const ok = [];
  const bad = [];

  // @ts-ignore
  const sortedByMetric = entries.slice().sort((a, b) => a[metric] - b[metric]);
  const sortedByLanternMetric = entries
    .slice()
    .sort((a, b) => a.lantern[lanternMetric] - b.lantern[lanternMetric]);

  const rankErrors = [];
  const percentErrors = [];
  for (let entry of entries) {
    // @ts-ignore
    const expected = Math.round(entry[metric]);
    if (expected === 0) continue;

    const expectedRank = sortedByMetric.indexOf(entry);
    const actual = Math.round(entry.lantern[lanternMetric]);
    const actualRank = sortedByLanternMetric.indexOf(entry);
    const diff = Math.abs(actual - expected);
    const diffAsPercent = diff / expected;
    const rankDiff = Math.abs(expectedRank - actualRank);
    const rankDiffAsPercent = rankDiff / entries.length;

    rankErrors.push(rankDiffAsPercent);
    percentErrors.push(diffAsPercent);
    entry = {...entry, expected, actual, diff, rankDiff, rankDiffAsPercent, metric};
    if (diffAsPercent < GOOD_ABSOLUTE_THRESHOLD || rankDiffAsPercent < GOOD_RANK_THRESHOLD) {
      good.push(entry);
    } else if (diffAsPercent < OK_ABSOLUTE_THRESHOLD) {
      ok.push(entry);
    } else bad.push(entry);
  }

  if (lanternMetric.includes('roughEstimate')) {
    totalGood.push(...good);
    totalOk.push(...ok);
    totalBad.push(...bad);
  }

  const MAPE = Math.round(percentErrors.reduce((x, y) => x + y) / percentErrors.length * 1000) / 10;
  const rank = Math.round(rankErrors.reduce((x, y) => x + y) / rankErrors.length * 1000) / 10;
  const buckets = `${good.length}/${ok.length}/${bad.length}`;
  console.log(
    `Evaluating ${metric} vs. ${lanternMetric}: ${rank}% ${MAPE}% - ${buckets}`
  );
}

console.log('----    Metric Stats    ----');
evaluateBuckets('firstContentfulPaint', 'optimisticFCP');
evaluateBuckets('firstContentfulPaint', 'pessimisticFCP');
evaluateBuckets('firstContentfulPaint', 'roughEstimateOfFCP');

evaluateBuckets('firstMeaningfulPaint', 'optimisticFMP');
evaluateBuckets('firstMeaningfulPaint', 'pessimisticFMP');
evaluateBuckets('firstMeaningfulPaint', 'roughEstimateOfFMP');

evaluateBuckets('timeToFirstInteractive', 'optimisticTTFCPUI');
evaluateBuckets('timeToFirstInteractive', 'pessimisticTTFCPUI');
evaluateBuckets('timeToFirstInteractive', 'roughEstimateOfTTFCPUI');

evaluateBuckets('timeToConsistentlyInteractive', 'optimisticTTI');
evaluateBuckets('timeToConsistentlyInteractive', 'pessimisticTTI');
evaluateBuckets('timeToConsistentlyInteractive', 'roughEstimateOfTTI');

evaluateBuckets('speedIndex', 'optimisticSI');
evaluateBuckets('speedIndex', 'pessimisticSI');
evaluateBuckets('speedIndex', 'roughEstimateOfSI');

const total = totalGood.length + totalOk.length + totalBad.length;
console.log('\n----    Summary Stats    ----');
console.log(`Good: ${Math.round(totalGood.length / total * 100)}%`);
console.log(`OK: ${Math.round(totalOk.length / total * 100)}%`);
console.log(`Bad: ${Math.round(totalBad.length / total * 100)}%`);

console.log('\n----    Worst10 Sites    ----');
for (const entry of totalBad.sort((a, b) => b.rankDiff - a.rankDiff).slice(0, 10)) {
  console.log(
    entry.actual < entry.expected ? 'underestimated' : 'overestimated',
    entry.metric,
    'by',
    Math.round(entry.diff),
    'on',
    entry.url
  );
}

/**
 * @typedef LanternSiteDefinition
 * @property {string} url
 * @property {string} tracePath
 * @property {string} devtoolsLogPath
 * @property {*} lantern
 * @property {string} [metric]
 * @property {number} [expected]
 * @property {number} [actual]
 * @property {number} [diff]
 * @property {number} [rankDiff]
 * @property {number} [rankDiffAsPercent]
 */
