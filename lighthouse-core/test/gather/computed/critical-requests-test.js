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

const CriticalRequest = require('../../../gather/computed/critical-requests');
const assert = require('assert');

const HIGH = 'High';
const VERY_HIGH = 'VeryHigh';
const MEDIUM = 'Medium';
const LOW = 'Low';
const VERY_LOW = 'VeryLow';

function mockTracingData(prioritiesList, edges) {
  const networkRecords = prioritiesList.map((priority, index) =>
      ({_requestId: index.toString(),
        _resourceType: {
          _category: 'fake'
        },
        finished: true,
        priority: () => priority,
        initiatorRequest: () => null
      }));

  // add mock initiator information
  edges.forEach(edge => {
    const initiator = networkRecords[edge[0]];
    networkRecords[edge[1]].initiatorRequest = () => initiator;
  });

  return networkRecords;
}

function testGetCriticalRequests(data) {
  const networkRecords = mockTracingData(data.priorityList, data.edges);
  const criticalChains = CriticalRequest.extractRequests(networkRecords);
  assert.deepEqual(criticalChains, data.expected);
}

let requests;
function constructEmptyRequest(parent = null, id = null) {
  const request = {
    id,
    parent: requests[parent] || null,
    endTime: undefined,
    responseReceivedTime: undefined,
    startTime: undefined,
    url: undefined,
    transferSize: undefined
  };

  requests[id] = request;

  return request;
}

describe('CriticalRequest gatherer: getCriticalRequests function', () => {
  beforeEach(() => {
    requests = {};
  });

  it('returns correct data for four critical requests', () =>
    testGetCriticalRequests({
      priorityList: [HIGH, MEDIUM, VERY_HIGH, HIGH],
      edges: [[0, 1], [1, 2], [2, 3]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest('0', '1'),
        constructEmptyRequest('1', '2'),
        constructEmptyRequest('2', '3'),
      ]
    }));

  it('returns correct data for chain interleaved with non-critical requests',
    () => testGetCriticalRequests({
      priorityList: [MEDIUM, HIGH, LOW, MEDIUM, HIGH, VERY_LOW],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest('0', '1'),
      ]
    }));

  it('returns correct data for two parallel chains', () =>
    testGetCriticalRequests({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 2], [1, 3]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest(null, '1'),
        constructEmptyRequest('0', '2'),
        constructEmptyRequest('1', '3'),
      ]
    }));

  it('returns correct data for fork at root', () =>
    testGetCriticalRequests({
      priorityList: [HIGH, HIGH, HIGH],
      edges: [[0, 1], [0, 2]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest('0', '1'),
        constructEmptyRequest('0', '2'),
      ]
    }));

  it('returns correct data for fork at non root', () =>
    testGetCriticalRequests({
      priorityList: [HIGH, HIGH, HIGH, HIGH],
      edges: [[0, 1], [1, 2], [1, 3]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest('0', '1'),
        constructEmptyRequest('1', '2'),
        constructEmptyRequest('1', '3'),
      ]
    }));

  it('returns empty list when no critical request', () =>
    testGetCriticalRequests({
      priorityList: [LOW, LOW],
      edges: [[0, 1]],
      expected: {}
    }));

  it('returns empty list when no request whatsoever', () =>
    testGetCriticalRequests({
      priorityList: [],
      edges: [],
      expected: {}
    }));

  it('returns correct data on a random big graph', () =>
    testGetCriticalRequests({
      priorityList: Array(9).fill(HIGH),
      edges: [[0, 1], [1, 2], [1, 3], [4, 5], [5, 7], [7, 8], [5, 6]],
      expected: [
        constructEmptyRequest(null, '0'),
        constructEmptyRequest('0', '1'),
        constructEmptyRequest('1', '2'),
        constructEmptyRequest('1', '3'),
        constructEmptyRequest(null, '4'),
        constructEmptyRequest('4', '5'),
        constructEmptyRequest('5', '6'),
        constructEmptyRequest('5', '7'),
        constructEmptyRequest('7', '8'),
      ]
    }));

  it('handles redirects', () => {
    const networkRecords = mockTracingData([HIGH, HIGH, HIGH], [[0, 1], [1, 2]]);

    // Make a fake redirect
    networkRecords[1].requestId = '1:redirected.0';
    networkRecords[2].requestId = '1';
    const criticalRequests = CriticalRequest.extractRequests(networkRecords);
    assert.deepEqual(criticalRequests, [
      constructEmptyRequest(null, '0'),
      constructEmptyRequest('0', '1'),
      constructEmptyRequest('1', '2'),
    ]);
  });


  it('discards favicons as non-critical', () => {
    const networkRecords = mockTracingData([HIGH, HIGH, HIGH, HIGH], [[0, 1], [0, 2], [0, 3]]);

    // 2nd record is a favicon
    networkRecords[1].url = 'https://example.com/favicon.ico';
    networkRecords[1].mimeType = 'image/x-icon';
    networkRecords[1].parsedURL = {
      lastPathComponent: 'favicon.ico'
    };
    // 3rd record is a favicon
    networkRecords[2].url = 'https://example.com/favicon-32x32.png';
    networkRecords[2].mimeType = 'image/png';
    networkRecords[2].parsedURL = {
      lastPathComponent: 'favicon-32x32.png'
    };
    // 4th record is a favicon
    networkRecords[3].url = 'https://example.com/android-chrome-192x192.png';
    networkRecords[3].mimeType = 'image/png';
    networkRecords[3].parsedURL = {
      lastPathComponent: 'android-chrome-192x192.png'
    };

    const criticalChains = CriticalRequest.extractRequests(networkRecords);
    assert.deepEqual(criticalChains, [
      constructEmptyRequest(null, '0')
    ]);
  });
});
