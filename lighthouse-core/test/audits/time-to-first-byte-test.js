/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimeToFirstByte = require('../../audits/time-to-first-byte.js');
const assert = require('assert');

/* eslint-env mocha */
describe('Performance: time-to-first-byte audit', () => {
  it('fails when ttfb of root document is higher than 215ms', () => {
    const networkRecords = [
      {_url: 'https://example.com/', _requestId: '0', _timing: {receiveHeadersEnd: 500, sendEnd: 200}},
      {_url: 'https://google.com/styles.css', _requestId: '1', _timing: {receiveHeadersEnd: 450, sendEnd: 200}},
      {_url: 'https://google.com/image.jpg', _requestId: '2', _timing: {receiveHeadersEnd: 600, sendEnd: 400}},
    ];
    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, false);
    });
  });

  it('succeeds when ttfb of root document is lower than 215ms', () => {
    const networkRecords = [
      {_url: 'https://example.com/', _requestId: '0', _timing: {receiveHeadersEnd: 300, sendEnd: 200}},
      {_url: 'https://google.com/styles.css', _requestId: '1', _timing: {receiveHeadersEnd: 450, sendEnd: 200}},
      {_url: 'https://google.com/image.jpg', _requestId: '2', _timing: {receiveHeadersEnd: 600, sendEnd: 400}},
    ];
    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, true);
    });
  });
});
