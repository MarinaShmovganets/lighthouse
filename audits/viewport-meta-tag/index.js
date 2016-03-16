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

/* global document */

'use strict';

class ViewportMetaTagTest {

  /**
   * Runs the Viewport Test. Looks for a viewport meta tag.
   * @param  {*} inputs The test inputs.
   * @return {Number} A score. 1 = viewport meta tag present; 0 = not found.
   */
  run(inputs) {

    const driver = inputs.driver;

    // Must be defined as a standalone function expression to be stringified successfully.
    const findMetaViewport = function() {
      return document.head.querySelector('meta[name="viewport"]');
    };

    // Load the page.
    return driver.gotoURL(inputs.url, driver.WAIT_FOR_LOAD)

      // Run the meta find script.
      .then(_ => driver.evaluateScript(findMetaViewport))

      // Test the result for validity.
      .then(obj => {
        const hasValidViewport =
            obj.type === "object" &&
            obj.subtype === 'node' &&
            obj.props.content.includes('width=');

        return Promise.resolve(hasValidViewport);
      })
      .catch(err => {
        throw err;
      });
  }

}

module.exports = new ViewportMetaTagTest();
