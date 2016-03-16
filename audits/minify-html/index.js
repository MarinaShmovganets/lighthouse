/**
 * Copyright 2015 Google Inc. All rights reserved.
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

class MinifyHTMLTest {

  /**
   * Runs the Minify HTML Test. Looks for minified HTML.
   * @param  {*} inputs The test inputs.
   * @return {Number} A score. 1 = 100% minified; 0 = 0% minified.
   */
  run (inputs) {

    const driver = inputs.driver;

    return driver.gotoURL(inputs.url, driver.WAIT_FOR_LOAD)
        .then(driver.getPageHTML)
        .then(html => {
          return new Promise((resolve, reject) => {
            // See how compressed the HTML _could_ be if whitespace was removed.
            // This could be a lot more aggressive.
            const htmlNoWhiteSpaces = html
                .replace(/\n/igm, '')
                .replace(/\t/igm, '')
                .replace(/\s+/igm, ' ');

            const htmlLen = Math.max(1, html.length);
            const htmlNoWhiteSpacesLen = htmlNoWhiteSpaces.length;
            const ratio = Math.min(1, (htmlNoWhiteSpacesLen / htmlLen));

            resolve(ratio);
          })
        });
  }
}

module.exports = new MinifyHTMLTest();
