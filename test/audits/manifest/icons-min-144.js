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
const Audit = require('../../../audits/manifest/icons-min-144.js');
const assert = require('assert');
const manifestParser = require('../../../helpers/manifest-parser');

/* global describe, it*/

describe('Manifest: icons-144 audit', () => {
  it('fails when no manifest present', () => {
    return assert.equal(Audit.audit({manifest: {
      value: undefined
    }}).value, false);
  });

  it('fails when a manifest contains no icons', () => {
    const inputs = {
      manifest: {
        icons: {}
      }
    };

    return assert.equal(Audit.audit(inputs).value, false);
  });

  it('fails when a manifest contains an icon with no size', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png'
      }]
    });
    const manifest = manifestParser(manifestSrc);

    return assert.equal(Audit.audit({manifest}).value, false);
  });

  it('succeeds when a manifest contains an icon with multiple sizes, one being > 144x144', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png',
        sizes: '72x72 96x96 128x128 256x256'
      }]
    });
    const manifest = manifestParser(manifestSrc);

    return assert.equal(Audit.audit({manifest}).value, true);
  });

  it('succeeds when a manifest contains an icon that\s 192x192', () => {
    // stub manifest contains a 192 icon
    const manifestSrc = JSON.stringify(require('./manifest.json'));
    const manifest = manifestParser(manifestSrc);

    return assert.equal(Audit.audit({manifest}).value, true);
  });

  it('succeeds when a manifest contains an icon with 144x144 within its sizes', () => {
    const manifestSrc = JSON.stringify({
      icons: [{
        src: 'icon.png',
        sizes: '96x96 128x128 144x144 256x256'
      }]
    });
    const manifest = manifestParser(manifestSrc);

    return assert.equal(Audit.audit({manifest}).value, true);
  });
});
