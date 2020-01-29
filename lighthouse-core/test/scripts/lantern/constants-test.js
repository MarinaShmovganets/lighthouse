/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const constants = require('../../../scripts/lantern/constants.js');

/* eslint-env jest */

describe('Lantern script helpers', () => {
  describe('#combineBaselineAndComputedDatasets', () => {
    it('should combine the two datasets on URL', () => {
      const siteIndex = {
        sites: [
          {url: 'urlA', wpt3g: {firstContentfulPaint: 150}, lantern: {roughEstimateOfFCP: 100}},
          {url: 'urlB', wpt3g: {firstContentfulPaint: 150}, lantern: {roughEstimateOfFCP: 100}},
        ],
      };
      const baseline = {
        sites: [{url: 'urlA', roughEstimateOfFCP: 100}, {url: 'urlC', roughEstimateOfFCP: 100}],
      };

      expect(constants.combineBaselineAndComputedDatasets(siteIndex, baseline)).toEqual([
        {
          url: 'urlA',
          wpt3g: {firstContentfulPaint: 150},
          lantern: {roughEstimateOfFCP: 100},
          baseline: {roughEstimateOfFCP: 100, url: 'urlA'},
        },
      ]);
    });

    it('should throw on empty data', () => {
      const siteIndex = {
        sites: [
          {url: 'urlB', wpt3g: {firstContentfulPaint: 150}, lantern: {roughEstimateOfFCP: 100}},
        ],
      };
      const baseline = {
        sites: [{url: 'urlA', roughEstimateOfFCP: 100}, {url: 'urlC', roughEstimateOfFCP: 100}],
      };

      expect(() => constants.combineBaselineAndComputedDatasets(siteIndex, baseline)).toThrow();
    });
  });

  describe('#evaluateSite', () => {
    it('should compute the diff', () => {
      const site = {url: 'http://example.com'};
      const expectedMetrics = {firstContentfulPaint: 1000};
      const actualMetrics = {roughEstimateOfFCP: 900};

      expect(
        constants.evaluateSite(
          site,
          expectedMetrics,
          actualMetrics,
          'firstContentfulPaint',
          'roughEstimateOfFCP'
        )
      ).toEqual({
        url: 'http://example.com',
        expected: 1000,
        actual: 900,
        diff: 100,
        diffAsPercent: 0.1,
        metric: 'firstContentfulPaint',
        lanternMetric: 'roughEstimateOfFCP',
      });
    });

    it('should return null on 0-data', () => {
      const site = {url: 'http://example.com'};
      const expectedMetrics = {firstContentfulPaint: 0};
      const actualMetrics = {roughEstimateOfFCP: 900};

      expect(
        constants.evaluateSite(
          site,
          expectedMetrics,
          actualMetrics,
          'firstContentfulPaint',
          'roughEstimateOfFCP'
        )
      ).toEqual(null);
    });
  });

  describe('#evaluateAccuracy', () => {
    const getMetric = ({url, lantern, wpt3g}) => ({
      url: url || 'http://example.com',
      wpt3g: {firstContentfulPaint: wpt3g},
      lantern: {roughEstimateOfFCP: lantern},
    });

    const evaluate = entries =>
      constants.evaluateAccuracy(
        entries.map(getMetric),
        'firstContentfulPaint',
        'roughEstimateOfFCP'
      );

    it('should build evaluations', () => {
      const entries = [
        {url: 'pageA', lantern: 1000, wpt3g: 2000},
        {url: 'pageB', lantern: 3000, wpt3g: 2000},
        {url: 'pageC', lantern: 5000, wpt3g: 1000},
        {url: 'pageD', lantern: 1000, wpt3g: 1000},
      ];

      expect(evaluate(entries)).toEqual({
        p50: 0.5,
        p90: 4,
        p95: 4,
        evaluations: [
          {
            actual: 1000,
            diff: 1000,
            diffAsPercent: 0.5,
            expected: 2000,
            lantern: {roughEstimateOfFCP: 1000},
            lanternMetric: 'roughEstimateOfFCP',
            metric: 'firstContentfulPaint',
            url: 'pageA',
            wpt3g: {firstContentfulPaint: 2000},
          },
          {
            actual: 3000,
            diff: 1000,
            diffAsPercent: 0.5,
            expected: 2000,
            lantern: {roughEstimateOfFCP: 3000},
            lanternMetric: 'roughEstimateOfFCP',
            metric: 'firstContentfulPaint',
            url: 'pageB',
            wpt3g: {firstContentfulPaint: 2000},
          },
          {
            actual: 5000,
            diff: 4000,
            diffAsPercent: 4,
            expected: 1000,
            lantern: {roughEstimateOfFCP: 5000},
            lanternMetric: 'roughEstimateOfFCP',
            metric: 'firstContentfulPaint',
            url: 'pageC',
            wpt3g: {firstContentfulPaint: 1000},
          },
          {
            actual: 1000,
            diff: 0,
            diffAsPercent: 0,
            expected: 1000,
            lantern: {roughEstimateOfFCP: 1000},
            lanternMetric: 'roughEstimateOfFCP',
            metric: 'firstContentfulPaint',
            url: 'pageD',
            wpt3g: {firstContentfulPaint: 1000},
          },
        ],
      });
    });

    it('should compute p90 and p95 correctly', () => {
      const entries = [];
      for (let i = 0; i < 100; i++) {
        // Construct a test array of 100 items where the error percent for each is equal to its index
        // i=0, lantern=1000, wpt3g=1000, error=0, errorPercent=0
        // i=1, lantern=2000, wpt3g=1000, error=1000, errorPercent=1
        // i=2, lantern=3000, wpt3g=1000, error=2000, errorPercent=2
        // ...
        entries.push({lantern: (i + 1) * 1000, wpt3g: 1000});
      }

      // Shuffle the array to make sure it's sorting
      entries.sort(() => Math.random() - 0.5);

      const data = evaluate(entries);
      expect(data).toMatchObject({
        p50: 50,
        p90: 90,
        p95: 95,
      });
    });
  });
});
