/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
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
const NetworkRecorder = require('../network-recorder');
const emulation = require('../emulation');
const Element = require('../element.js');
const port = process.env.PORT || 9222;

const log = (typeof process === 'undefined') ? console.log.bind(console) : require('npmlog').log;

class ChromeProtocol {

  get WAIT_FOR_LOAD() {
    return true;
  }

  constructor() {
    this._url = null;
    this._chrome = null;
    this._traceEvents = [];
    this._traceCategories = [
      '-*', // exclude default
      'toplevel',
      'blink.console',
      'blink.user_timing',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.stack',
      'disabled-by-default-devtools.screenshot',
      'disabled-by-default-v8.cpu_profile'
    ];

    this.timeoutID = null;
  }

  get url() {
    return this._url;
  }

  set url(_url) {
    this._url = _url;
  }

  /**
   * @return {!Promise<null>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this._chrome) {
        return resolve();
      }

      chromeRemoteInterface({port: port}, chrome => {
        this._chrome = chrome;
        this.beginLogging();
        this.beginEmulation().then(_ => {
          resolve();
        });
      }).on('error', e => reject(e));
    });
  }

  disconnect() {
    if (this._chrome === null) {
      return;
    }

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }

    this._chrome.close();
    this._chrome = null;
    this.url = null;
  }

  beginLogging() {
    // log events received
    this._chrome.on('event', req => _log('verbose', '<=', req));
  }

  /**
   * Bind listeners for protocol events
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  on(eventName, cb) {
    if (this._chrome === null) {
      throw new Error('Trying to call on() but no cri instance available yet');
    }
    // log event listeners being bound
    _log('info', 'listen for event =>', {method: eventName});
    this._chrome.on(eventName, cb);
  }

  /**
   * Unbind event listeners
   * @param {!string} eventName
   * @param {function(...)} cb
   */
  off(eventName, cb) {
    this._chrome.removeListener(eventName, cb);
  }

  /**
   * Call protocol methods
   * @param {!string} command
   * @param {!Object} params
   * @return {!Promise}
   */
  sendCommand(command, params) {
    return new Promise((resolve, reject) => {
      _log('info', 'method => browser', {method: command, params: params});

      this._chrome.send(command, params, (err, result) => {
        if (err) {
          return reject(result);
        }
        resolve(result);
      });
    });
  }

  /**
   * Resolves when all outstanding protocol methods have returned.
   * @return {!Promise}
   */
  pendingCommandsComplete() {
    return new Promise((resolve, reject) => {
      this._chrome.once('ready', _ => resolve());
    });
  }

  gotoURL(url, waitForLoad) {
    const sendCommand = this.sendCommand.bind(this);

    return new Promise((resolve, reject) => {
      Promise.resolve()
      .then(_ => sendCommand('Page.enable'))
      .then(_ => sendCommand('Page.navigate', {url: url}))
      .then(response => {
        this.url = url;

        if (!waitForLoad) {
          return resolve(response);
        }
        this.on('Page.loadEventFired', response => resolve(response));
      });
    });
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {!Promise<Element>} The found element, or null, resolved in a promise
   */
  querySelector(selector) {
    return this.sendCommand('DOM.getDocument')
      .then(result => result.root.nodeId)
      .then(nodeId => this.sendCommand('DOM.querySelector', {
        nodeId,
        selector
      }))
      .then(element => {
        if (element.nodeId === 0) {
          return null;
        }
        return new Element(element, this);
      });
  }

  _resetFailureTimeout(reject) {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = null;
    }

    this.timeoutID = setTimeout(_ => {
      this.disconnect();
      reject(new Error('Trace retrieval timed out'));
    }, 15000);
  }

  beginTrace() {
    this._traceEvents = [];
    const sendCommand = this.sendCommand.bind(this);
    const tracingOpts = {
      categories: this._traceCategories.join(','),
      options: 'sampling-frequency=10000'  // 1000 is default and too slow.
    };

    this.on('Tracing.dataCollected', data => {
      this._traceEvents.push(...data.value);
    });

    return this.connect()
      .then(_ => sendCommand('Page.enable'))
      .then(_ => sendCommand('Tracing.start', tracingOpts));
  }

  endTrace() {
    return new Promise((resolve, reject) => {
      // When all Tracing.dataCollected events have finished, this event fires
      this.on('Tracing.tracingComplete', _ => resolve(this._traceEvents));

      return this.connect().then(_ => {
        this.sendCommand('Tracing.end');
        this._resetFailureTimeout(reject);
      });
    });
  }

  /**
   * @param {function(!Object)=} requestListener Optional callback for every finished request.
   */
  beginNetworkCollect(requestListener) {
    return this.connect().then(_ => {
      return new Promise((resolve, reject) => {
        this._networkRecords = [];
        this._networkRecorder = new NetworkRecorder(this._networkRecords, requestListener);

        this.on('Network.requestWillBeSent', this._networkRecorder.onRequestWillBeSent);
        this.on('Network.requestServedFromCache', this._networkRecorder.onRequestServedFromCache);
        this.on('Network.responseReceived', this._networkRecorder.onResponseReceived);
        this.on('Network.dataReceived', this._networkRecorder.onDataReceived);
        this.on('Network.loadingFinished', this._networkRecorder.onLoadingFinished);
        this.on('Network.loadingFailed', this._networkRecorder.onLoadingFailed);

        this.sendCommand('Network.enable');
        this.pendingCommandsComplete().then(_ => {
          resolve();
        });
      });
    });
  }

  endNetworkCollect() {
    return this.connect().then(_ => {
      return new Promise((resolve, reject) => {
        this.off('Network.requestWillBeSent', this._networkRecorder.onRequestWillBeSent);
        this.off('Network.requestServedFromCache', this._networkRecorder.onRequestServedFromCache);
        this.off('Network.responseReceived', this._networkRecorder.onResponseReceived);
        this.off('Network.dataReceived', this._networkRecorder.onDataReceived);
        this.off('Network.loadingFinished', this._networkRecorder.onLoadingFinished);
        this.off('Network.loadingFailed', this._networkRecorder.onLoadingFailed);

        this.sendCommand('Network.disable');
        this.pendingCommandsComplete().then(_ => {
          resolve(this._networkRecords);
          this._networkRecorder = null;
          this._networkRecords = [];
        });
      });
    });
  }

  beginEmulation() {
    return new Promise((resolve, reject) => {
      emulation.enableNexus5X(this);
      emulation.enableNetworkThrottling(this);
      emulation.disableCache(this);
      this.pendingCommandsComplete().then(_ => resolve());
    });
  }
}

function _log(level, prefix, data) {
  const columns = (typeof process === 'undefined') ? Infinity : process.stdout.columns;
  const maxLength = columns - data.method.length - prefix.length - 7;
  const snippet = data.params ? JSON.stringify(data.params).substr(0, maxLength) : '';
  log(level, prefix, data.method, snippet);
}

module.exports = ChromeProtocol;
