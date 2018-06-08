/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkManager = require('./web-inspector').NetworkManager;
const NetworkRequest = require('./network-request');
const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');

const IGNORED_NETWORK_SCHEMES = ['data', 'ws'];

/** @typedef {'requestloaded'|'network-2-idle'|'networkidle'|'networkbusy'|'network-2-busy'} NetworkRecorderEvent */

class NetworkRecorder extends EventEmitter {
  /**
   * Creates an instance of NetworkRecorder.
   */
  constructor() {
    super();

    /** @type {NetworkRequest[]} */
    this._records = [];
    /** @type {Map<string, NetworkRequest>} */
    this._recordsById = new Map();

    this.networkManager = NetworkManager.createWithFakeTarget();

    this.networkManager.addEventListener(
      this.EventTypes.RequestStarted,
      this.onRequestStarted.bind(this)
    );
    this.networkManager.addEventListener(
      this.EventTypes.RequestFinished,
      this.onRequestFinished.bind(this)
    );
  }

  getRecords() {
    return this._records.slice();
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  once(event, listener) {
    return super.once(event, listener);
  }

  get EventTypes() {
    return NetworkManager.Events;
  }

  isIdle() {
    return !!this._getActiveIdlePeriod(0);
  }

  is2Idle() {
    return !!this._getActiveIdlePeriod(2);
  }

  /**
   * @param {number} allowedRequests
   */
  _getActiveIdlePeriod(allowedRequests) {
    const quietPeriods = NetworkRecorder.findNetworkQuietPeriods(this._records, allowedRequests);
    return quietPeriods.find(period => !Number.isFinite(period.end));
  }

  _emitNetworkStatus() {
    const zeroQuiet = this._getActiveIdlePeriod(0);
    const twoQuiet = this._getActiveIdlePeriod(2);

    if (twoQuiet && zeroQuiet) {
      log.verbose('NetworkRecorder', 'network fully-quiet');
      this.emit('network-2-idle');
      this.emit('networkidle');
    } else if (twoQuiet && !zeroQuiet) {
      log.verbose('NetworkRecorder', 'network semi-quiet');
      this.emit('network-2-idle');
      this.emit('networkbusy');
    } else {
      log.verbose('NetworkRecorder', 'network busy');
      this.emit('network-2-busy');
      this.emit('networkbusy');
    }
  }

  /**
   * QUIC network requests don't always "finish" even when they're done loading data, use recievedHeaders
   * @see https://github.com/GoogleChrome/lighthouse/issues/5254
   * @param {LH.WebInspector.NetworkRequest} record
   * @return {boolean}
   */
  static _isQUICAndFinished(record) {
    const isQUIC =
      record._responseHeaders &&
      record._responseHeaders.some(
        header => header.name.toLowerCase() === 'alt-svc' && /quic/.test(header.value)
      );
    const receivedHeaders = record._timing && record._timing.receiveHeadersEnd > 0;
    return !!(isQUIC && receivedHeaders && record.endTime);
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests.
   * @param {Array<LH.WebInspector.NetworkRequest>} networkRecords
   * @param {number} allowedConcurrentRequests
   * @param {number=} endTime
   * @return {Array<{start: number, end: number}>}
   */
  static findNetworkQuietPeriods(networkRecords, allowedConcurrentRequests, endTime = Infinity) {
    // First collect the timestamps of when requests start and end
    /** @type {Array<{time: number, isStart: boolean}>} */
    let timeBoundaries = [];
    networkRecords.forEach(record => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (IGNORED_NETWORK_SCHEMES.includes(scheme)) {
        return;
      }

      // convert the network record timestamp to ms
      timeBoundaries.push({time: record.startTime * 1000, isStart: true});
      if (record.finished || NetworkRecorder._isQUICAndFinished(record)) {
        timeBoundaries.push({time: record.endTime * 1000, isStart: false});
      }
    });

    timeBoundaries = timeBoundaries
      .filter(boundary => boundary.time <= endTime)
      .sort((a, b) => a.time - b.time);

    let numInflightRequests = 0;
    let quietPeriodStart = 0;
    /** @type {Array<{start: number, end: number}>} */
    const quietPeriods = [];
    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        // we've just started a new request. are we exiting a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriods.push({start: quietPeriodStart, end: boundary.time});
        }
        numInflightRequests++;
      } else {
        numInflightRequests--;
        // we've just completed a request. are we entering a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriodStart = boundary.time;
        }
      }
    });

    // Check we ended in a quiet period
    if (numInflightRequests <= allowedConcurrentRequests) {
      quietPeriods.push({start: quietPeriodStart, end: endTime});
    }

    return quietPeriods.filter(period => period.start !== period.end);
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestStarted(request) {
    this._records.push(request);
    this._recordsById.set(request.requestId, request);

    this._emitNetworkStatus();
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestloaded', request);
    this._emitNetworkStatus();
  }

  // The below methods proxy network data into the DevTools SDK network layer.
  // There are a few differences between the debugging protocol naming and
  // the parameter naming used in NetworkManager. These are noted below.

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRequestWillBeSent(data) {
    let originalRequest = this._findRealRequest(data.requestId);
    if (originalRequest) {
      // TODO(phulce): log these to sentry?
      if (!data.redirectResponse) {
        return;
      }

      const modifiedData = {...data, requestId: `${originalRequest.requestId}:redirected`};
      const redirectRequest = new NetworkRequest();

      redirectRequest.onRequestWillBeSent(modifiedData);
      originalRequest.onRedirectResponse(data);

      originalRequest.redirectDestination = redirectRequest;
      redirectRequest.redirectSource = originalRequest;

      this.onRequestStarted(redirectRequest);
      this.onRequestFinished(originalRequest);
      return;
    }

    const request = new NetworkRequest();
    request.onRequestWillBeSent(data);
    this.onRequestStarted(request);
  }

  /**
   * @param {LH.Crdp.Network.RequestServedFromCacheEvent} data
   */
  onRequestServedFromCache(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onRequestServedFromCache();
  }

  /**
   * @param {LH.Crdp.Network.ResponseReceivedEvent} data
   */
  onResponseReceived(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onResponseReceived(data);
  }

  /**
   * @param {LH.Crdp.Network.DataReceivedEvent} data
   */
  onDataReceived(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onDataReceived(data);
  }

  /**
   * @param {LH.Crdp.Network.LoadingFinishedEvent} data
   */
  onLoadingFinished(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onLoadingFinished(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {LH.Crdp.Network.LoadingFailedEvent} data
   */
  onLoadingFailed(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onLoadingFailed(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {LH.Crdp.Network.ResourceChangedPriorityEvent} data
   */
  onResourceChangedPriority(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onResourceChangedPriority(data);
  }

  /**
   * Routes network events to their handlers, so we can construct networkRecords
   * @param {LH.Protocol.RawEventMessage} event
   */
  dispatch(event) {
    if (!event.method.startsWith('Network.')) {
      return;
    }

    switch (event.method) {
      case 'Network.requestWillBeSent':
        return this.onRequestWillBeSent(event.params);
      case 'Network.requestServedFromCache':
        return this.onRequestServedFromCache(event.params);
      case 'Network.responseReceived':
        return this.onResponseReceived(event.params);
      case 'Network.dataReceived':
        return this.onDataReceived(event.params);
      case 'Network.loadingFinished':
        return this.onLoadingFinished(event.params);
      case 'Network.loadingFailed':
        return this.onLoadingFailed(event.params);
      case 'Network.resourceChangedPriority':
        return this.onResourceChangedPriority(event.params);
      default:
        return;
    }
  }

  /**
   * @param {string} requestId
   * @return {NetworkRequest|undefined}
   */
  _findRealRequest(requestId) {
    let request = this._recordsById.get(requestId);
    if (!request) return undefined;

    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    return request;
  }

  /**
   * Construct network records from a log of devtools protocol messages.
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Array<LH.WebInspector.NetworkRequest>}
   */
  static recordsFromLogs(devtoolsLog) {
    const nr = new NetworkRecorder();
    devtoolsLog.forEach(message => {
      nr.dispatch(message);
    });
    return nr.getRecords();
  }
}

module.exports = NetworkRecorder;
