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

const Gatherer = require('./gatherer');
const manifestParser = require('../../lib/manifest-parser');
const BOM_ENCODING = [0xEF, 0xBB, 0xBF];

/**
 * Uses the debugger protocol to fetch the manifest from within the context of
 * the target page, reusing any credentials, emulation, etc, already established
 * there. The artifact produced is the fetched string, if any, passed through
 * the manifest parser.
 */
class Manifest extends Gatherer {
  /**
   * Returns the parsed manifest or null if the page had no manifest. If the manifest
   * was unparseable as JSON, manifest.value will be undefined and manifest.debugString
   * will have the reason. See manifest-parser.js for more information.
   * @param {!Object} options
   * @return {!Promise<?Manifest>}
   */
  afterPass(options) {
    return options.driver.getAppManifest()
      .then(response => {
        return manifestParser(response.data, response.url, options.url);
      })
      .catch(err => {
        if (err === 'No web app manifest found.') {
          return null;
        }

<<<<<<< HEAD
        return Promise.reject(err);
=======
        const isBomEncoded = Buffer.from(response.data).slice(1, 4)
          .equals(new Buffer(BOM_ENCODING));
        if (isBomEncoded) {
          throw new Error('Manifest is encoded with BOM. Please remove the BOM encoding');
        }

        return manifestParser(response.data, response.url, options.url);
>>>>>>> Throw error when manifest is BOM encoding
      });
  }
}

module.exports = Manifest;
