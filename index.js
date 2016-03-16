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

let TestLoader = require('./helpers/test-loader');
let RemoteFileLoader = require('./helpers/remote-file-loader');
let ChromeProtocol = require('./helpers/browser/driver');
let processor = require('./lib/processor');

class TestRunner {

  static get() {
    return new Promise((resolve, reject) => {
      TestLoader.getTests('audits').then(tests => {
        resolve(new TestRunner(tests));
      });
    });
  }

  constructor(tests) {
    this.tests_ = tests;
    this.driver_ = null;
    this.loader_ = new RemoteFileLoader();
  }

  test(url) {
    const driver = new ChromeProtocol();

    return driver.gotoURL(url)
        .then(() => {
          const testNames = Object.keys(this.tests_);
          const testResponses = [];

          testNames.forEach(testName => {
            const testInfo = this.tests_[testName];
            const test = require(testInfo.main);

            console.log(`Running ${testName}`);

            testResponses
                .push(test.run({
                  url: url,
                  driver: driver
                })
                .then(result => {
                  return {testName, result};
                })
            );
          });

          return Promise.all(testResponses);
        })
        .then(results => {
          if (this.driver_ !== null) {
            if (typeof this.driver_.browser !== 'undefined') {
              this.driver_.browser.quit();
            }
          }

          return results;
        });
  }
}

TestRunner.get()
    .then(testRunner => testRunner.test('https://voice-memos.appspot.com/'))
    .then(results => {
      console.log(results);
      process.exit(0);
    }, err => {
      console.error(err);
    });

module.exports = {
  RESPONSE: processor.RESPONSE,
  ANIMATION: processor.ANIMATION,
  LOAD: processor.LOAD,

  analyze: function(traceContents, opts) {
    return processor.analyzeTrace(traceContents, opts);
  }
};
