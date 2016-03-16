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

const traceProcessor = require('../../lib/processor');

class TimeInJavaScriptTest {

  run (inputs) {
    return new Promise((resolve, reject) => {
      const driver = inputs.driver;

      driver.disableCaching()

        // Fire up the trace.
        .then(driver.beginTrace)

        // Go to the URL.
        .then(_ => driver.gotoURL(inputs.url, driver.WAIT_FOR_LOAD))

        // Stop the trace, which captures the records.
        .then(driver.endTrace)

        // Analyze them.
        .then(contents => traceProcessor.analyzeTrace(contents))

        .then(results => {
          resolve(results[0].extendedInfo.javaScript);
        }, err => {
          console.error(err);
          throw err;
        }).catch(err => {
          console.error(err);
          throw err;
        });
    });
  }
}

module.exports = new TimeInJavaScriptTest();
