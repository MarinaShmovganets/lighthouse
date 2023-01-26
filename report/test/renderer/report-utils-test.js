/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import assert from 'assert/strict';

import {ReportUtils} from '../../renderer/report-utils.js';
import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {readJson} from '../../../core/test/test-utils.js';
import {Globals} from '../../renderer/report-globals.js';

const sampleResult = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('util helpers', () => {
  beforeEach(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });
  });

  afterEach(() => {
    Globals.i18n = undefined;
  });

  it('calculates a score ratings', () => {
    assert.equal(ReportUtils.calculateRating(0.0), 'fail');
    assert.equal(ReportUtils.calculateRating(0.10), 'fail');
    assert.equal(ReportUtils.calculateRating(0.45), 'fail');
    assert.equal(ReportUtils.calculateRating(0.5), 'average');
    assert.equal(ReportUtils.calculateRating(0.75), 'average');
    assert.equal(ReportUtils.calculateRating(0.80), 'average');
    assert.equal(ReportUtils.calculateRating(0.90), 'pass');
    assert.equal(ReportUtils.calculateRating(1.00), 'pass');
  });

  it('builds device emulation string', () => {
    const get = settings => ReportUtils.getEmulationDescriptions(settings).deviceEmulation;
    /* eslint-disable max-len */
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: false, mobile: true}}), 'Emulated Moto G4');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}}), 'No emulation');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Moto G4');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: false, mobile: false}}), 'Emulated Desktop');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: false}}), 'No emulation');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Desktop');
    /* eslint-enable max-len */
  });

  it('builds throttling strings when provided', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'provided',
      screenEmulation: {disabled: true},
    });
    assert.equal(descriptions.cpuThrottling, 'Provided by environment');
    assert.equal(descriptions.networkThrottling, 'Provided by environment');
    assert.equal(descriptions.screenEmulation, undefined);
  });

  it('builds throttling strings when devtools', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'devtools',
      throttling: {
        cpuSlowdownMultiplier: 4.5,
        requestLatencyMs: 565,
        downloadThroughputKbps: 1400.00000000001,
        uploadThroughputKbps: 600,
      },
      screenEmulation: {disabled: true},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '565\xa0ms HTTP RTT, 1,400\xa0kb/s down, 600\xa0kb/s up (DevTools)');
    assert.equal(descriptions.cpuThrottling, '4.5x slowdown (DevTools)');
  });

  it('builds throttling strings when simulate', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 2,
        rttMs: 150,
        throughputKbps: 1600,
      },
      screenEmulation: {width: 100, height: 100, deviceScaleFactor: 2},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '150\xa0ms TCP RTT, 1,600\xa0kb/s throughput (Simulated)');
    assert.equal(descriptions.cpuThrottling, '2x slowdown (Simulated)');
    assert.equal(descriptions.screenEmulation, '100x100, DPR 2');
  });

  describe('#prepareReportResult', () => {
    describe('backward compatibility', () => {
      it('corrects underscored `notApplicable` scoreDisplayMode', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        let notApplicableCount = 0;
        Object.values(clonedSampleResult.audits).forEach(audit => {
          if (audit.scoreDisplayMode === 'notApplicable') {
            notApplicableCount++;
            audit.scoreDisplayMode = 'not_applicable';
          }
        });

        assert.ok(notApplicableCount > 20); // Make sure something's being tested.

        // Original audit results should be restored.
        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);

        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects undefined auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Delete debugdata details types.
        let undefinedCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            undefinedCount++;
            delete audit.details.type;
          }
        }
        assert.ok(undefinedCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects `diagnostic` auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Change debugdata details types.
        let diagnosticCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            diagnosticCount++;
            audit.details.type = 'diagnostic';
          }
        }
        assert.ok(diagnosticCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects screenshots in the `filmstrip` auditDetails.type', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Strip filmstrip screenshots of data URL prefix.
        let filmstripCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'filmstrip') {
            filmstripCount++;
            for (const screenshot of audit.details.items) {
              screenshot.data = screenshot.data.slice('data:image/jpeg;base64,'.length);
            }
          }
        }
        assert.ok(filmstripCount > 0); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('moves full-page-screenshot audit', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        clonedSampleResult.audits['full-page-screenshot'] = {
          details: {
            type: 'full-page-screenshot',
            ...sampleResult.fullPageScreenshot,
          },
        };
        delete clonedSampleResult.fullPageScreenshot;

        assert.ok(clonedSampleResult.audits['full-page-screenshot'].details.nodes); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
        assert.deepStrictEqual(preparedResult.fullPageScreenshot, sampleResult.fullPageScreenshot);
      });

      it('corrects performance category without hidden group', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        clonedSampleResult.lighthouseVersion = '8.6.0';
        delete clonedSampleResult.categoryGroups['hidden'];
        for (const auditRef of clonedSampleResult.categories['performance'].auditRefs) {
          if (auditRef.group === 'hidden') {
            delete auditRef.group;
          } else if (!auditRef.group) {
            auditRef.group = 'diagnostics';
          }
        }
        assert.notDeepStrictEqual(clonedSampleResult.categories, sampleResult.categories);
        assert.notDeepStrictEqual(clonedSampleResult.categoryGroups, sampleResult.categoryGroups);

        // Original audit results should be restored.
        const clonedPreparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        const preparedResult = ReportUtils.prepareReportResult(sampleResult);
        assert.deepStrictEqual(clonedPreparedResult.categories, preparedResult.categories);
        assert.deepStrictEqual(clonedPreparedResult.categoryGroups, preparedResult.categoryGroups);
      });

      it('converts old opportunity table column headings to consolidated table headings', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        const auditsWithTableDetails = Object.values(clonedSampleResult.audits)
          .filter(audit => audit.details?.type === 'table');
        assert.notEqual(auditsWithTableDetails.length, 0);
        for (const audit of auditsWithTableDetails) {
          for (const heading of audit.details.headings) {
            heading.itemType = heading.valueType;
            heading.text = heading.label;
            delete heading.valueType;
            delete heading.label;

            if (heading.subItemsHeading) {
              heading.subItemsHeading.itemType = heading.subItemsHeading.valueType;
              // @ts-expect-error
              delete heading.subItemsHeading.valueType;
            }
          }
        }

        const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(sampleResult.audits, preparedResult.audits);
      });
    });

    it('appends stack pack descriptions to auditRefs', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));
      const iconDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      clonedSampleResult.stackPacks = [{
        id: 'snackpack',
        title: 'SnackPack',
        iconDataURL,
        descriptions: {
          'unused-css-rules': 'Consider using snacks in packs.',
        },
      }];
      const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);

      const perfAuditRefs = preparedResult.categories.performance.auditRefs;
      const unusedCssRef = perfAuditRefs.find(ref => ref.id === 'unused-css-rules');
      assert.deepStrictEqual(unusedCssRef.stackPacks, [{
        title: 'SnackPack',
        iconDataURL,
        description: 'Consider using snacks in packs.',
      }]);

      // No stack pack on audit wth no stack pack.
      const interactiveRef = perfAuditRefs.find(ref => ref.id === 'interactive');
      assert.strictEqual(interactiveRef.stackPacks, undefined);
    });
  });

  describe('#shouldDisplayAsFraction', () => {
    it('returns true for timespan and snapshot', () => {
      expect(ReportUtils.shouldDisplayAsFraction('navigation')).toEqual(false);
      expect(ReportUtils.shouldDisplayAsFraction('timespan')).toEqual(true);
      expect(ReportUtils.shouldDisplayAsFraction('snapshot')).toEqual(true);
      expect(ReportUtils.shouldDisplayAsFraction(undefined)).toEqual(false);
    });
  });

  describe('#calculateCategoryFraction', () => {
    it('returns passed audits and total audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 3, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 2, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'binary'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 4,
        numPassed: 3,
        numInformative: 0,
        totalWeight: 6,
      });
    });

    it('ignores manual audits, N/A audits, and hidden audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'hidden'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'manual'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'notApplicable'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 1,
        numPassed: 1,
        numInformative: 0,
        totalWeight: 1,
      });
    });

    it('tracks informative audits separately', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'informative'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'informative'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 2,
        numPassed: 2,
        numInformative: 2,
        totalWeight: 2,
      });
    });
  });
});
