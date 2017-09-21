/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/redirects.js');
const assert = require('assert');

/* eslint-env mocha */
const FAILING_REDIRECT_CHAIN = {
  '0.1:redirected.0': {
    request: {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'http://example.com/',
    },
    children: {
      '1.1:redirected.1': {
        request: {
          endTime: 16,
          responseReceivedTime: 14,
          startTime: 11,
          url: 'https://example.com/',
        },
        children: {
          '2.1:redirected.2': {
            request: {
              endTime: 17,
              responseReceivedTime: 15,
              startTime: 12,
              url: 'https://m.example.com/',
            },
            children: {},
          },
        },
      },
    },
  },
};

const SUCCESS_ONE_REDIRECT_CHAIN = {
  '0.1:redirected.0': {
    request: {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'https://example.com/',
    },
    children: {
      '1.1': {
        request: {
          endTime: 16,
          responseReceivedTime: 14,
          startTime: 11,
          url: 'https://m.example.com/',
        },
        children: {
        },
      },
      '3.1': {
        request: {
          endTime: 17,
          responseReceivedTime: 15,
          startTime: 12,
          url: 'https://m.example.com/file.js',
        },
        children: {},
      },
    },
  },
};

const SUCCESS_REDIRECT_CHAIN = {
  '0.1': {
    request: {
      endTime: 1,
      responseReceivedTime: 5,
      startTime: 0,
      url: 'https://example.com/',
    },
    children: {
      '1.1': {
        request: {
          endTime: 16,
          responseReceivedTime: 14,
          startTime: 11,
          url: 'https://example.com/file.js',
        },
        children: {
          '2.1': {
            request: {
              endTime: 17,
              responseReceivedTime: 15,
              startTime: 12,
              url: 'https://m.example.com/file.css',
            },
            children: {},
          },
        },
      },
    },
  },
};

const mockArtifacts = (mockChain) => {
  return {
    devtoolsLogs: {
      [Audit.DEFAULT_PASS]: [],
    },
    requestNetworkRecords: () => {
      return Promise.resolve([]);
    },
    requestCriticalRequestChains: function() {
      return Promise.resolve(mockChain);
    },
  };
};

describe('Performance: Redirects audit', () => {
  it('fails when more than one redirect detected', () => {
    return Audit.audit(mockArtifacts(FAILING_REDIRECT_CHAIN)).then(output => {
      assert.equal(output.score, 2);
      assert.equal(output.rawValue, 11000);
    });
  });

  it('passes when one redirect detected', () => {
    return Audit.audit(mockArtifacts(SUCCESS_ONE_REDIRECT_CHAIN)).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.rawValue, 6000);
    });
  });

  it('passes when no redirect detected', () => {
    return Audit.audit(mockArtifacts(SUCCESS_REDIRECT_CHAIN)).then(output => {
      assert.equal(output.score, 0);
      assert.equal(output.rawValue, 0);
    });
  });
});
