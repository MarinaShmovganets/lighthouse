/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const ComputedArtifact = require('./computed-artifact');
const icons = require('../../lib/icons');

const DISPLAY_VALUES = ['browser', 'fullscreen', 'minimal-ui', 'standalone'];
// const PWA_DISPLAY_VALUES = ['fullscreen', 'standalone'];

class ManifestValues extends ComputedArtifact {

  get name() {
    return 'ManifestValues';
  }

  static get manifestExistsChecklist() {
    return [
      {
        id: 'hasManifest',
        userText: 'Manifest is available',
        toPass: manifest => manifest !== null
      },
      {
        id: 'hasParseableManifest',
        userText: 'Manifest is parsed as a valid manifest',
        toPass: manifest => manifest !== null && typeof manifest !== 'undefined' && !!manifest.value
      }
    ];
  }

  static get manifestChecklist() {
    return [
      {
        id: 'hasStartUrl',
        userText: 'Manifest contains `start_url`',
        toPass: manifest => !!manifest.start_url.value
      },
      {
        id: 'hasIconsAtLeast144px',
        userText: 'Manifest contains icons at least 144px',
        toPass: manifest => icons.doExist(manifest) &&
            icons.sizeAtLeast(144, /** @type {!Manifest} */ (manifest)).length > 0
      },
      {
        id: 'hasDisplayValue',
        userText: 'Manifest\'s `display` value is explicitly set',
        // Check for the debugString, added when fallback is defined
        toPass: manifest => DISPLAY_VALUES.includes(manifest.display.value) &&
          !manifest.display.debugString
      },
      // Disabled for the moment
      // {
      //   id: 'hasPWADisplayValue',
      //   userText: 'Manifest\'s `display` value is either standalone or fullscreen',
      //   toPass: manifest => PWA_DISPLAY_VALUES.includes(manifest.display.value)
      // },
      {
        id: 'hasShortName',
        userText: 'Manifest contains `short_name`',
        toPass: manifest => !!manifest.short_name.value
      },
      {
        id: 'hasName',
        userText: 'Manifest contains `name`.',
        toPass: manifest => !!manifest.name.value
      }
    ];
  }

  /**
   * Returns results of all manifest checks
   * @param {Manifest} manifest
   * @return {Array}
   */
  compute_(manifest) {
    // basic checks to verify the Manifest exists and is valid
    const existChecks = ManifestValues.manifestExistsChecklist.map(item => {
      item.passing = item.toPass(manifest);
      delete item.toPass;
      return item;
    });
    if (existChecks.some(item => !item.passing)) {
      return existChecks;
    }

    // standard checks
    return ManifestValues.manifestChecklist.map(item => {
      item.passing = item.toPass(manifest.value);
      delete item.toPass;
      return item;
    });
  }

}

module.exports = ManifestValues;
