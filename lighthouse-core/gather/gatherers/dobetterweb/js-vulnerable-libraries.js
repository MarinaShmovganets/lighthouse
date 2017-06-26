/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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

/**
 * @fileoverview Gathers a list of libraries and
 any known vulnerabilities they contain.
 */

/* global document ShadowRoot */

'use strict';

const Gatherer = require('../gatherer');
const fs = require('fs');
const semver = require('semver');
const libDetector = require('js-library-detector');
// https://snyk.io/partners/api/v2/vulndb/clientside.json
const snykDB = JSON.parse(fs.readFileSync(require.resolve('../../../../third-party/snyk-snapshot.json'), 'utf8'));

/**
 * Obtains a list of an object contain any detected JS libraries
 * and the versions they're using.
 * @return {!Object}
 */
/* istanbul ignore next */
function detectLibraries() {
  // From https://raw.githubusercontent.com/johnmichel/Library-Detector-for-Chrome/master/library/libraries.js

  let libraries = [];
  for (let i in d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests) {
    try {
      const result = d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests[i].test(window);
      if (result === false) continue;
      libraries.push({
          name: i,
          version: result.version,
          npmPkgName: d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests[i].npm
      });
    } catch(e) {}
  }
  return libraries;
}


class JSVulnerableLibraries extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<!Array<!Object>>}
   */
  afterPass(options) {
    const expression = `(function () {
      return (${detectLibraries.toString()}());
    })()`;

    return options.driver
      .evaluateAsync(expression)
      .then(libraries => {
        //add vulns to raw libraries results
        let vulns = [];
        for (let i in libraries) {
             if (snykDB.npm[libraries[i].npmPkgName]) {
                let snykInfo = snykDB.npm[libraries[i].npmPkgName];
                for (let j in snykInfo) {
                    if (semver.satisfies(libraries[i].version, snykInfo[j].semver.vulnerable[0])) {
                        // valid vulnerability
                        vulns.push({
                        	severity: snykInfo[j].severity,
                        	library: libraries[i].name + '@' + libraries[i].version,
                        	url: 'https://snyk.io/vuln/' + snykInfo[j].id
                        });
                    }
                }
               	libraries[i].vulns = vulns;
             }
        }
        return {libraries};
      })
      .then(returnedValue => {
        return returnedValue;
      });
  }
}

module.exports = JSVulnerableLibraries;
