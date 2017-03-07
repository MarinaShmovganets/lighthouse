/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';


const Audit = require('./audit');
const icons = require('../lib/icons');


class WebappInstallBanner extends Audit {

  static get meta() {
    // ....
  }

  static hasServiceWorker(artifacts) {
    // Find active service worker for this URL. Match against
    // artifacts.URL.finalUrl so audit accounts for any redirects.
    const versions = artifacts.ServiceWorker.versions;
    const url = artifacts.URL.finalUrl;

    const origin = new URL(url).origin;
    const matchingSW = versions.find(v => v.status === 'activated' &&
        new URL(v.scriptURL).origin === origin);
    return !!matchingSW;
  }

  static get manifestChecklist() {
    return [
      {
        id: 'hasManifest',
        desc: 'Nanifest is available.',
        passing: manifest => manifest !== null
      },
      {
        id: 'hasParseableManifest',
        desc: 'Manifest is parsed as a valid manifest.',
        passing: manifest => typeof manifest !== 'undefined' && !!manifest.value
      },
      {
        id: 'hasStartUrl',
        desc: 'Manifest contains `start_url`',
        passing: manifest => !!manifest.start_url.value
      },
      {
        id: 'hasIconsAtLeast144px',
        desc: 'Manifest contains icons at least 144px',
        passing: manifest => icons.doExist(manifest) &&
            icons.sizeAtLeast(144, /** @type {!Manifest} */ (manifest)).length > 0
      },
      {
        id: 'hasShortName',
        desc: 'Manifest contains `short_name`',
        passing: manifest => !!manifest.short_name.value
      },
      {
        id: 'hasName',
        desc: 'Manifest contains `name`',
        passing: manifest => !!manifest.name.value
      }
    ];
  }

  static audit(artifacts) {
    const failures = [];

    // 1: validate manifest is in order
    WebappInstallBanner.manifestChecklist.forEach(item => {
      if (!item.passing(artifacts.Manifest)) {
        failures.push(item.desc);
      }
    });

    // 2: validate we have a SW
    if (!WebappInstallBanner.hasServiceWorker(artifacts)) {
      failures.push('Site registers a Service Worker.');
    }

    // If we fail, share the failures
    if (failures.length > 0) {
      return WebappInstallBanner.generateAuditResult({
        rawValue: false,
        debugString: `Unsatisfied requirements: ${failures.join(', ')}.`
      });
    }

    // Otherwise, we pass
    return WebappInstallBanner.generateAuditResult({
      rawValue: true
    });





  }

}



module.exports = WebappInstallBanner;




    // const display = standalone or fullscreen
