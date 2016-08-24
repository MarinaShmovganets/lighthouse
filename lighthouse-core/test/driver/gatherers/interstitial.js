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

const InterstitialGatherer = require('../../../driver/gatherers/interstitial');
const assert = require('assert');
let interstitialGatherer;

describe('Interstitial gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    interstitialGatherer = new InterstitialGatherer();
  });

  it('returns an artifact', () => {
    return interstitialGatherer.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve(['test']);
        }
      }
    }).then(_ => {
      assert.ok(Array.isArray(interstitialGatherer.artifact));
      assert.equal(interstitialGatherer.artifact.length, 1);
    });
  });

  it('handles driver failure', () => {
    return interstitialGatherer.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }).then(_ => {
      assert(false);
    }).catch(_ => {
      assert.equal(interstitialGatherer.artifact, -1);
    });
  });

  it('successfully locates interstitial-like elements', () => {
    return new Promise((resolve, _) => {
      const context = {
        window: {
          getComputedStyle(element) {
            const styles = {
              backgroundColor: 'red',
              position: 'fixed',
              opacity: 1,
              pointerEvents: 'auto',
              display: 'block'
            };

            switch (element.name) {
              case 1:
                // Fails test.
                styles.backgroundColor = 'rgba(0, 0, 0, 0)';
                break;

              case 2:
                // Fails test.
                styles.backgroundColor = 'hsla(0, 0, 0, 0)';
                break;

              case 3:
                // Passes test.
                styles.backgroundColor = 'hsla(0, 0, 0, 0)';
                styles.backgroundImage = 'url(example.png)';
                styles.backgroundRepeat = 'repeat-x';
                break;

              case 4:
                // Fails test.
                styles.position = 'relative';
                break;

              case 5:
                // Fails test.
                styles.opacity = 0;
                break;

              case 6:
                // Fails test.
                styles.pointerEvents = 'none';
                break;

              case 7:
                // Fails test.
                styles.display = 'none';
                break;

              default:
                // Passes test.
                break;
            }

            return styles;
          },
          outerWidth: 500,
          outerHeight: 500
        },
        document: {
          querySelectorAll() {
            const getBoundingClientRect = function() {
              // Fails test.
              if (this.name === 8) {
                return {
                  width: 100, height: 100
                };
              }

              // Passes test.
              return {
                width: 500, height: 500
              };
            };

            return [0, 1, 2, 3, 4, 5, 6, 7, 8].map(name => {
              return {
                name,
                getBoundingClientRect: getBoundingClientRect.bind({name})
              };
            });
          }
        }
      };

      global.window = context.window;
      global.document = context.document;
      global.__returnResults = results => {
        assert.ok(Array.isArray(results));
        assert.equal(results.length, 2);
        assert.equal(results[0].name, 0);
        assert.equal(results[1].name, 3);
        resolve();

        global.__returnResults = null;
      };

      const test = InterstitialGatherer.test.bind(context);
      test();

      global.window = null;
      global.document = null;
    });
  });
});
