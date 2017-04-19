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

const ManifestGatherer = require('./manifest');

class StartUrl extends ManifestGatherer {
  afterPass(options) {
    let startUrl = options.url;

    return super.afterPass(options)
      .then(manifest => {
        if (!manifest) {
          return Promise.reject(`Unable to retrieve manifest at ${options.url}`);
        }

        startUrl = manifest.value.start_url.raw;
      })
      .then(_ => options.driver.goOffline())
      .then(_ => options.driver.evaluateAsync(
          `fetch('${startUrl}').then(response => response.status)
            .catch(err => -1)`
      ))
      .then(code => {
        return options.driver.goOnline(options)
          .then(_ => code);
      });
  }
}

module.exports = StartUrl;
