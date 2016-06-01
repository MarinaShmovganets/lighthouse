/**
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

/* eslint-env mocha */

/* NB: this is identical to the html test; it just checks afterThirdReloadPageLoad, not postProfiling */
const HTMLWithoutJavaScriptGather = require('../../../src/gatherers/html-without-javascript');
const assert = require('assert');
let htmlWithoutJavaScriptGather;

describe('HTML without JavaScript gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    htmlWithoutJavaScriptGather = new HTMLWithoutJavaScriptGather();
  });

  it('returns an artifact', () => {
    return htmlWithoutJavaScriptGather.afterThirdReloadPageLoad({
      driver: {
        sendCommand(cmd) {
          switch (cmd) {
            case 'Runtime.evaluate':
              return Promise.resolve({
                result: {value: 'Hello!'}
              });

            default:
              throw new Error('Unsupported command');
          }
        }
      }
    }).then(_ => {
      assert.ok(typeof htmlWithoutJavaScriptGather.artifact === 'string');
      assert.ok(/Hello/gim.test(htmlWithoutJavaScriptGather.artifact));
    });
  });

  it('handles driver failure', () => {
    return htmlWithoutJavaScriptGather.afterThirdReloadPageLoad({
      driver: {
        sendCommand() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.ok('value' in htmlWithoutJavaScriptGather.artifact);
      assert.ok('debugString' in htmlWithoutJavaScriptGather.artifact);
    });
  });
});
