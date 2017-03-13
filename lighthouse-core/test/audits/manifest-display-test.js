/**
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

const ManifestDisplayAudit = require('../../audits/manifest-display.js');
const manifestParser = require('../../lib/manifest-parser');
const assert = require('assert');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

/* eslint-env mocha */

describe('Mobile-friendly: display audit', () => {
  it('only accepts when a value is set for the display prop', () => {
    assert.equal(ManifestDisplayAudit.hasRecommendedValue('fullscreen'), true);
    assert.equal(ManifestDisplayAudit.hasRecommendedValue('standalone'), true);
    assert.equal(ManifestDisplayAudit.hasRecommendedValue('browser'), true);
    assert.equal(ManifestDisplayAudit.hasRecommendedValue('minimal-ui'), true);
    assert.equal(ManifestDisplayAudit.hasRecommendedValue('different'), false);
    assert.equal(ManifestDisplayAudit.hasRecommendedValue(undefined), false);
  });

  it('fails with no debugString if page had no manifest', () => {
    const result = ManifestDisplayAudit.audit({
      Manifest: null
    });
    assert.strictEqual(result.rawValue, false);
    assert.strictEqual(result.debugString, undefined);
  });

  it('falls back to the successful default when there is no manifest display property', () => {
    const artifacts = {
      Manifest: manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestDisplayAudit.audit(artifacts);

    assert.equal(output.displayValue, 'browser');
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  it('succeeds when a manifest has a display property', () => {
    const artifacts = {
      Manifest: manifestParser(JSON.stringify({
        display: 'standalone'
      }), EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL)
    };
    const output = ManifestDisplayAudit.audit(artifacts);
    assert.equal(output.displayValue, 'standalone');
    assert.equal(output.rawValue, true);
    assert.equal(output.debugString, undefined);
  });

  it('succeeds when a complete manifest contains a display property', () => {
    return assert.equal(ManifestDisplayAudit.audit({Manifest: exampleManifest}).rawValue, true);
  });
});
