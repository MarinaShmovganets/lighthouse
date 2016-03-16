/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const chromeRemoteInterface = require('chrome-remote-interface');

class ChromeProtocol {

  constructor(opts) {
    opts = opts || {};

    this.categories = [
      "-*", // exclude default
      "toplevel",
      "blink.console",
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "disabled-by-default-devtools.timeline.stack",
      "disabled-by-default-devtools.screenshot",
      "disabled-by-default-v8.cpu_profile"
    ];
    this._traceEvents = [];
    this._currentURL = null;
    this._instance = null;

    this.evaluateScript = this.evaluateScript.bind(this);
    this.getServiceWorkerRegistrations = this.getServiceWorkerRegistrations.bind(this);
    this.beginTrace = this.beginTrace.bind(this);
    this.endTrace = this.endTrace.bind(this);
  }

  get WAIT_FOR_LOAD() {
    return true;
  }

  get instance() {
    if (this._instance) {
      return Promise.resolve(this._instance);
    }

    return new Promise((resolve, reject) => {
      /* @see: github.com/cyrus-and/chrome-remote-interface#moduleoptions-callback */
      const OPTIONS = {};

      chromeRemoteInterface(OPTIONS,
        instance => {
          this._instance = instance;
          return resolve(instance);
        }
      ).on('error', e => reject(e));
    });
  }

  resetFailureTimeout(reject) {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
    }

    this.timeoutID = setTimeout(_ => {
      reject(new Error('Trace retrieval timed out'));
    }, 15000);
  }

  getServiceWorkerRegistrations() {
    return this.instance.then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.ServiceWorker.enable();
        chrome.on("ServiceWorker.workerVersionUpdated", data => {
          resolve(data);
        });
      });
    });
  }

  evaluateScript(scriptStr) {
    return this.instance.then(chrome => {
      const contexts = [];
      const wrappedScriptStr = '(' + scriptStr.toString() + ')()';

      chrome.Runtime.enable();
      chrome.on('Runtime.executionContextCreated', res => {
        contexts.push(res.context);
      });

      return new Promise((resolve, reject) => {
        const evalScriptWithRuntime = () => {
          chrome.Runtime.evaluate({
            expression: wrappedScriptStr,
            contextId: contexts[0].id // Hard dependency.
          }, (err, evalRes) => {
            if (err || evalRes.wasThrown) {
              return reject(evalRes);
            }

            chrome.Runtime.getProperties({
              objectId: evalRes.result.objectId
            }, (err, res) => {
              if (err) {
                return reject(err);
              }

              evalRes.result.props = {};
              if (!Array.isArray(res.result)) {
                res.result = [res.result];
              }

              res.result.forEach(prop => {
                evalRes.result.props[prop.name] = prop.value ?
                    prop.value.value : prop.get.description;
              });

              resolve(evalRes.result);
            });
          });
        };

        // Allow time to pull in some contexts.
        setTimeout(evalScriptWithRuntime, 500);
      });
    });
  }

  gotoURL(url, waitForLoad) {
    return this.instance.then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.Page.navigate({url: url}, (err, response) => {
          if (err) {
            reject(err);
          }

          if (waitForLoad) {
            chrome.Page.loadEventFired(_ => {
              this._currentURL = url;
              resolve(response);
            });
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  beginTrace() {
    this._traceEvents = [];

    return this.instance.then(chrome => {
      chrome.Page.enable();
      chrome.Tracing.start({
        categories: this.categories.join(','),
        options: 'sampling-frequency=10000'  // 1000 is default and too slow.
      });

      chrome.Tracing.dataCollected(data => {
        this._traceEvents.push(...data.value);
      });

      return true;
    });
  }

  disableCaching() {
    // TODO(paullewis): implement.
    return Promise.resolve(true);
  }

  endTrace() {
    return this.instance.then(chrome => {
      return new Promise((resolve, reject) => {
        chrome.Tracing.end();
        this.resetFailureTimeout(reject);

        chrome.Tracing.tracingComplete(_ => {
          resolve(this._traceEvents);
          // this.discardTab(); // FIXME: close connection later
        });
      });
    });
  }

}

module.exports = ChromeProtocol;
