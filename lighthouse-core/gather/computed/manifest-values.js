/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const ComputedArtifact = require('./computed-artifact');

class ManifestValues extends ComputedArtifact {

  get name() {
    return 'ManifestValues';
  }

  static get manifestChecklist() {
    return [
      {
        id: 'hasManifest',
        userText: 'Nanifest is available.',
        passing: manifest => manifest !== null
      },
      {
        id: 'hasParseableManifest',
        userText: 'Manifest is parsed as a valid manifest.',
        passing: manifest => typeof manifest !== 'undefined' && !!manifest.value
      },
      {
        id: 'hasStartUrl',
        userText: 'Manifest contains `start_url`',
        passing: manifest => !!manifest.start_url.value
      },
      {
        id: 'hasIconsAtLeast144px',
        userText: 'Manifest contains icons at least 144px',
        passing: manifest => icons.doExist(manifest) &&
            icons.sizeAtLeast(144, /** @type {!Manifest} */ (manifest)).length > 0
      },
      {
        id: 'hasShortName',
        userText: 'Manifest contains `short_name`',
        passing: manifest => !!manifest.short_name.value
      },
      {
        id: 'hasName',
        userText: 'Manifest contains `name`',
        passing: manifest => !!manifest.name.value
      }
    ];
  }

  /**
   * Return catapult traceviewer model
   * @param {{traceEvents: !Array}} trace
   * @return {!TracingProcessorModel}
   */
  compute_(trace) {
    const tracingProcessor = new TracingProcessor();
    return tracingProcessor.init(trace);
  }

}

module.exports = ManifestValues;
