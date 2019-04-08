/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('../../lib/network-request.js');
const assert = require('assert');

/* eslint-env jest */
describe('network request', function() {
  afterEach(() => {
    global.isLightrider = undefined;
  });

  function getRequest() {
    const req = new NetworkRequest();
    req.transferSize = 100;
    req.responseHeaders = [{name: NetworkRequest.HEADER_FETCHED_SIZE, value: 10}];
    return req;
  }

  describe('update transfer size for lightrider', function() {
    it('does nothing if not Lightrider', function() {
      const req = getRequest();
      global.isLightrider = false;

      assert.equal(req.transferSize, 100);
      req._updateTransferSizeForLightrider();
      assert.equal(req.transferSize, 100);
    });

    it('updates transfer size', function() {
      const req = getRequest();
      global.isLightrider = true;

      assert.equal(req.transferSize, 100);
      req._updateTransferSizeForLightrider();
      assert.equal(req.transferSize, 10);
    });

    it('does nothing if header is non float', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = [{name: NetworkRequest.HEADER_FETCHED_SIZE, value: 'ten'}];

      assert.equal(req.transferSize, 100);
      req._updateTransferSizeForLightrider();
      assert.equal(req.transferSize, 100);
      assert.notEqual(req.transferSize, NaN);
    });

    it('does nothing if no header is set', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = [];

      assert.equal(req.transferSize, 100);
      req._updateTransferSizeForLightrider();
      assert.equal(req.transferSize, 100);
    });
  });

  describe('update fetch stats for Lightrider', function() {
    function getRequest() {
      const req = new NetworkRequest();
      // units = seconds
      req.startTime = 0;
      req.endTime = 2;
      req.responseReceivedTime = 1;
      req.timing = {
        requestTime: -1,
        proxyStart: -1,
        proxyEnd: -1,
        dnsStart: -1,
        dnsEnd: -1,
        connectStart: -1,
        connectEnd: -1,
        sslStart: -1,
        sslEnd: -1,
        workerStart: -1,
        workerReady: -1,
        sendStart: -1,
        sendEnd: -1,
        pushStart: -1,
        pushEnd: -1,
        receiveHeadersEnd: -1,
      };

      // units = ms
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: 10000},
        {name: NetworkRequest.HEADER_TCP, value: 5000},
        {name: NetworkRequest.HEADER_REQ, value: 2500},
        {name: NetworkRequest.HEADER_SSL, value: 1000},
        {name: NetworkRequest.HEADER_RES, value: 2500}];
      return req;
    }

    it('does nothing if not Lightrider', function() {
      const req = getRequest();
      global.isLightrider = false;

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
    });

    it('does nothing if no TotalTime', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = req.responseHeaders.filter(item => item.name
        !== NetworkRequest.HEADER_TOTAL);

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
    });

    it('does nothing if Header timings don\'t add up', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: 10000},
        {name: NetworkRequest.HEADER_TCP, value: 5001},
        {name: NetworkRequest.HEADER_REQ, value: 2500},
        {name: NetworkRequest.HEADER_SSL, value: 1000},
        {name: NetworkRequest.HEADER_RES, value: 2500}];

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
    });

    it('does nothing if timing is not initialized', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.timing = undefined;

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
    });

    it('Updates lrStatistics', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: 10000},
        {name: NetworkRequest.HEADER_TCP, value: 5000},
        {name: NetworkRequest.HEADER_REQ, value: 2500},
        {name: NetworkRequest.HEADER_SSL, value: 1000},
        {name: NetworkRequest.HEADER_RES, value: 2500}];

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.lrStatistics.TCPMs, 5000);
      assert.equal(req.lrStatistics.requestMs, 2500);
      assert.equal(req.lrStatistics.responseMs, 2500);
    });

    it('Doesn\'t update lrStatistics with NaN', function() {
      const req = getRequest();
      global.isLightrider = true;
      req.responseHeaders = [{name: NetworkRequest.HEADER_TOTAL, value: 10000},
        {name: NetworkRequest.HEADER_TCP, value: NaN},
        {name: NetworkRequest.HEADER_REQ, value: 2500},
        {name: NetworkRequest.HEADER_SSL, value: 1000},
        {name: NetworkRequest.HEADER_RES, value: 2500}];

      assert.equal(req.startTime, 0);
      assert.equal(req.endTime, 2);
      assert.equal(req.responseReceivedTime, 1);
      req._updateTimingsForLightrider();
      assert.equal(req.lrStatistics, undefined);
    });
  });
});
