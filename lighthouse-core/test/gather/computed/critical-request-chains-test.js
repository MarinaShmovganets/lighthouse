/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const GathererClass = require('../../../gather/computed/critical-request-chains');
const assert = require('assert');

function testGetCriticalRequestsChains(criticalRequests, expected) {
  const artifacts = {
    requestCriticalRequests: () => Promise.resolve(criticalRequests),
  };

  const Gatherer = new GathererClass(artifacts);
  return Gatherer.request([]).then(criticalRequests => {
    assert.deepEqual(criticalRequests, expected);
  });
}

let requests;
function constructEmptyRequest(id = null) {
  const request = {
    id,
    endTime: undefined,
    responseReceivedTime: undefined,
    startTime: undefined,
    url: undefined,
    transferSize: undefined,
  };

  requests[id] = request;

  return request;
}

describe('CriticalRequest gatherer: getCriticalRequests function', () => {
  beforeEach(() => {
    requests = {};
  });

  it('returns correct data for four critical requests', () => {
    const criticalRequests = [
      constructEmptyRequest('0'),
      constructEmptyRequest('1'),
      constructEmptyRequest('2'),
      constructEmptyRequest('3'),
    ];

    const expected = {
      '0': {
        request: Object.assign({}, criticalRequests[0]),
        children: {
          '1': {
            request: Object.assign({}, criticalRequests[1]),
            children: {
              '2': {
                request: Object.assign({}, criticalRequests[2]),
                children: {
                  '3': {
                    request: Object.assign({}, criticalRequests[3]),
                    children: {},
                  }
                }
              }
            }
          }
        }
      }
    };

    criticalRequests[0].parent = null;
    criticalRequests[1].parent = criticalRequests[0];
    criticalRequests[2].parent = criticalRequests[1];
    criticalRequests[3].parent = criticalRequests[2];

    return testGetCriticalRequestsChains(criticalRequests, expected);
  });

  it('returns correct data for two parallel chains', () => {
    const criticalRequests = [
      constructEmptyRequest('0'),
      constructEmptyRequest('1'),
      constructEmptyRequest('2'),
      constructEmptyRequest('3'),
    ];

    const expected = {
      '0': {
        request: Object.assign({}, criticalRequests[0]),
        children: {
          '2': {
            request: Object.assign({}, criticalRequests[2]),
            children: {},
          },
        },
      },
      '1': {
        request: Object.assign({}, criticalRequests[1]),
        children: {
          '3': {
            request: Object.assign({}, criticalRequests[3]),
            children: {},
          },
        },
      },
    };

    criticalRequests[0].parent = null;
    criticalRequests[1].parent = null;
    criticalRequests[2].parent = criticalRequests[0];
    criticalRequests[3].parent = criticalRequests[1];

    return testGetCriticalRequestsChains(criticalRequests, expected);
  });

  it('returns empty list when no request whatsoever', () =>
    testGetCriticalRequestsChains([], {})
  );


  it('returns correct data on a random big graph', () => {
    const criticalRequests = [
      constructEmptyRequest('0'),
      constructEmptyRequest('1'),
      constructEmptyRequest('2'),
      constructEmptyRequest('3'),
      constructEmptyRequest('4'),
      constructEmptyRequest('5'),
      constructEmptyRequest('6'),
      constructEmptyRequest('7'),
    ];

    const expected = {
      '0': {
        request: Object.assign({}, criticalRequests[0]),
        children: {
          '1': {
            request: Object.assign({}, criticalRequests[1]),
            children: {
              '2': {
                request: Object.assign({}, criticalRequests[2]),
                children: {
                  '3': {
                    request: Object.assign({}, criticalRequests[3]),
                    children: {},
                  },
                },
              },
            },
          },
        },
      },
      '4': {
        request: Object.assign({}, criticalRequests[4]),
        children: {
          '5': {
            request: Object.assign({}, criticalRequests[5]),
            children: {
              '6': {
                request: Object.assign({}, criticalRequests[6]),
                children: {
                  '7': {
                    request: Object.assign({}, criticalRequests[7]),
                    children: {},
                  },
                },
              },
            },
          },
        },
      },
    };

    criticalRequests[0].parent = null;
    criticalRequests[1].parent = criticalRequests[0];
    criticalRequests[2].parent = criticalRequests[1];
    criticalRequests[3].parent = criticalRequests[2];
    criticalRequests[4].parent = null;
    criticalRequests[5].parent = criticalRequests[4];
    criticalRequests[6].parent = criticalRequests[5];
    criticalRequests[7].parent = criticalRequests[6];

    return testGetCriticalRequestsChains(criticalRequests, expected);
  });

  it('handles redirects', () => {
    const criticalRequests = [
      constructEmptyRequest('0'),
      constructEmptyRequest('1:redirected.0'),
      constructEmptyRequest('1'),
    ];

    const expected = {
      '0': {
        request: Object.assign({}, criticalRequests[0]),
        children: {
          '1:redirected.0': {
            request: Object.assign({}, criticalRequests[1]),
            children: {
              '1': {
                request: Object.assign({}, criticalRequests[2]),
                children: {
                },
              },
            },
          },
        },
      },
    };

    criticalRequests[0].parent = null;
    criticalRequests[1].parent = criticalRequests[0];
    criticalRequests[2].parent = criticalRequests[1];

    return testGetCriticalRequestsChains(criticalRequests, expected);
  });
});
