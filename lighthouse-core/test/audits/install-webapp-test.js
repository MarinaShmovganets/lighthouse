/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const InstallWebAppAudit = require('../../audits/install-webapp');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';
const exampleManifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

const GatherRunner = require('../../gather/gather-runner.js');

function generateMockArtifacts() {
  const computedArtifacts = GatherRunner.instantiateComputedArtifacts();
  const mockArtifacts = Object.assign({}, computedArtifacts, {
    Manifest: exampleManifest,
    ServiceWorker: {
      versions: [{
        status: 'activated',
        scriptURL: 'https://example.com/sw.js'
      }]
    },
    URL: {finalUrl: 'https://example.com'}
  });
  return mockArtifacts;
}

/* eslint-env mocha */

describe('PWA: webapp install banner audit', () => {
  it('passes with complete manifest and SW', () => {
    return InstallWebAppAudit.audit(generateMockArtifacts()).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.strictEqual(result.debugString, undefined);
    });
  });

  it('fails with if page had no manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = null;

    return InstallWebAppAudit.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.debugString);
      assert.ok(result.debugString.includes('is available'), result.debugString);
    });
  });

  it('fails with if page had no icons in the manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest.value.icons.value = [];

    return InstallWebAppAudit.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.debugString);
      assert.ok(result.debugString.includes('icons'), result.debugString);
    });
  });

  it('fails with if page had no SW', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ServiceWorker.versions = [];

    return InstallWebAppAudit.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.debugString);
      assert.ok(result.debugString.includes('Service Worker'), result.debugString);
    });
  });
});
