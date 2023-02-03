/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import assert from 'assert/strict';

import {upgradeLhrForCompatibility} from '../../lib/lighthouse-compatibility.js';
import {readJson} from '../../../core/test/test-utils.js';

/** @type {LH.Result} */
const sampleResult = readJson('../../../core/test/results/sample_v2.json', import.meta);

/**
 * @param {LH.Result} original
 * @return {LH.Result}
 */
function cloneLhr(original) {
  const cloned = JSON.parse(JSON.stringify(original));
  return cloned;
}

/**
 * Simple wrapper function to avoid needing to rewrite tests.
 * @param {LH.Result} original
 * @return {LH.Result}
 */
function upgradeLhr(original) {
  const cloned = cloneLhr(original);
  upgradeLhrForCompatibility(cloned);
  return cloned;
}

describe('backward compatibility', () => {
  it('corrects underscored `notApplicable` scoreDisplayMode', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

    let notApplicableCount = 0;
    Object.values(clonedSampleResult.audits).forEach(audit => {
      if (audit.scoreDisplayMode === 'notApplicable') {
        notApplicableCount++;
        audit.scoreDisplayMode = 'not_applicable';
      }
    });

    assert.ok(notApplicableCount > 20); // Make sure something's being tested.

    // Original audit results should be restored.
    const preparedResult = upgradeLhr(clonedSampleResult);

    assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
  });

  it('corrects undefined auditDetails.type to `debugdata`', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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
    const preparedResult = upgradeLhr(clonedSampleResult);
    assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
  });

  it('corrects `diagnostic` auditDetails.type to `debugdata`', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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
    const preparedResult = upgradeLhr(clonedSampleResult);
    assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
  });

  it('corrects screenshots in the `filmstrip` auditDetails.type', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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
    const preparedResult = upgradeLhr(clonedSampleResult);
    assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
  });

  it('moves full-page-screenshot audit', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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
    const preparedResult = upgradeLhr(clonedSampleResult);
    assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
    assert.deepStrictEqual(preparedResult.fullPageScreenshot, sampleResult.fullPageScreenshot);
  });

  it('corrects performance category without hidden group', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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
    const clonedPreparedResult = upgradeLhr(clonedSampleResult);
    const preparedResult = upgradeLhr(sampleResult);
    assert.deepStrictEqual(clonedPreparedResult.categories, preparedResult.categories);
    assert.deepStrictEqual(clonedPreparedResult.categoryGroups, preparedResult.categoryGroups);
  });

  it('converts old opportunity table column headings to consolidated table headings', () => {
    const clonedSampleResult = cloneLhr(sampleResult);

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

    const preparedResult = upgradeLhr(clonedSampleResult);
    assert.deepStrictEqual(sampleResult.audits, preparedResult.audits);
  });
});
