/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const ComputedArtifact = require('./computed-artifact');
const icons = require('../../lib/icons');

const PWA_DISPLAY_VALUES = ['minimal-ui', 'fullscreen', 'standalone'];

// Historically, Chrome recommended 12 chars as the maximum short_name length to prevent truncation.
// See #69 for more discussion & https://developer.chrome.com/apps/manifest/name#short_name
const SUGGESTED_SHORTNAME_LENGTH = 12;

class ManifestValues extends ComputedArtifact {

  get name() {
    return 'ManifestValues';
  }

  static get manifestChecklist() {
    return [
      {
        id: 'hasManifest',
        groups: ['validity'],
        userText: 'Manifest is available',
        toPass: manifest => manifest !== null
      },
      {
        id: 'hasParseableManifest',
        groups: ['validity'],
        userText: 'Manifest is parsed as JSON',
        toPass: manifest => typeof manifest !== 'undefined' && !!manifest.value
      },
      {
        id: 'hasStartUrl',
        groups: ['banner'],
        userText: 'Manifest contains `start_url`',
        toPass: manifest => !!manifest.value.start_url.value
      },
      {
        id: 'hasIconsAtLeast192px',
        groups: ['banner'],
        userText: 'Manifest contains icons at least 192px',
        toPass: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(192, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasIconsAtLeast512px',
        groups: ['splash'],
        userText: 'Manifest contains icons at least 512px',
        toPass: manifest => icons.doExist(manifest.value) &&
            icons.sizeAtLeast(512, /** @type {!Manifest} */ (manifest.value)).length > 0
      },
      {
        id: 'hasPWADisplayValue',
        groups: ['banner'],
        userText: 'Manifest\'s `display` value is one of: ' + PWA_DISPLAY_VALUES.join(', '),
        toPass: manifest => PWA_DISPLAY_VALUES.includes(manifest.value.display.value)
      },
      {
        id: 'hasBackgroundColor',
        groups: ['splash'],
        userText: 'Manifest contains `background_color`',
        toPass: manifest => !!manifest.value.background_color.value
      },
      {
        id: 'hasThemeColor',
        groups: ['splash', 'omnibox'],
        userText: 'Manifest contains `theme_color`',
        toPass: manifest => !!manifest.value.theme_color.value
      },
      {
        id: 'hasShortName',
        groups: ['banner', 'splash', 'shortNameLength'],
        userText: 'Manifest contains `short_name`',
        toPass: manifest => !!manifest.value.short_name.value
      },
      {
        id: 'shortNameLength',
        groups: ['shortNameLength'],
        userText: 'Manifest `short_name` won\'t be truncated when displayed on the homescreen',
        toPass: manifest => manifest.value.short_name.value &&
            manifest.value.short_name.value.length <= SUGGESTED_SHORTNAME_LENGTH
      },
      {
        id: 'hasName',
        groups: ['banner', 'splash'],
        userText: 'Manifest contains `name`',
        toPass: manifest => !!manifest.value.name.value
      }
    ];
  }

  /**
   * Returns results of all manifest checks
   * @param {Manifest} manifest
   * @return {Array}
   */
  compute_(manifest) {
    // if the manifest isn't there or is invalid, we'll report that first
    const existsChecks = ManifestValues.manifestChecklist.filter(item =>
        item.groups.includes('validity'));

    for (let i = 0; i < existsChecks.length; i++) {
      const item = existsChecks[i];
      item.passing = item.toPass(manifest);
      if (item.passing === false)
        return [item];
    }

    // evaluate the other checks
    return ManifestValues.manifestChecklist.map(item => {
      item.passing = item.toPass(manifest);
      return item;
    });
  }

}

module.exports = ManifestValues;
