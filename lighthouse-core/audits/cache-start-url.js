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

const url = require('url');
const Audit = require('./audit');

class CacheStartUrl extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Manifest',
      name: 'cache-start-url',
      description: 'Cache contains start_url from manifest',
      requiredArtifacts: ['CacheContents', 'Manifest', 'URL']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    let cacheHasStartUrl = false;

    if (!(artifacts.Manifest &&
          artifacts.Manifest.value &&
          artifacts.Manifest.value.start_url &&
          Array.isArray(artifacts.CacheContents) &&
          artifacts.URL)) {
      return CacheStartUrl.generateAuditResult({
        rawValue: false
      });
    }

    const manifest = artifacts.Manifest.value;
    const cacheContents = artifacts.CacheContents;
    const baseURL = artifacts.URL;

    // Remove any UTM strings.
    const startURL = url.resolve(baseURL, manifest.start_url.raw)
        .toString()
        .replace(/\?utm_source=([^&]|$)*/, '')
        .replace(/\?$/, '');

    // Now find the start_url in the cacheContents
    cacheHasStartUrl = cacheContents.find(req => {
      return startURL === req;
    });

    return CacheStartUrl.generateAuditResult({
      rawValue: (cacheHasStartUrl !== undefined)
    });
  }
}

module.exports = CacheStartUrl;
