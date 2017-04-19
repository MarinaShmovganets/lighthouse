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

const URL = require('../../../lib/url-shim');
const StartUrlGatherer = require('../../../gather/gatherers/start-url');
const assert = require('assert');
const tracingData = require('../../fixtures/traces/network-records.json');

const mockDriver = {
  goOffline() {
    return Promise.resolve();
  },
  goOnline() {
    return Promise.resolve();
  },
};

const wrapSendCommand = (mockDriver, url) => {
  mockDriver.evaluateAsync = () => {
    url = new URL(url);
    url.hash = '';

    const record = findRequestByUrl(url.href);
    if (!record) {
      return -1;
    }

    return record.statusCode;
  };

  mockDriver.sendCommand = (name) => {
    if (name === 'Page.getAppManifest') {
      return Promise.resolve({
        data: '{"start_url": "' + url + '"}',
        errors: [],
        url,
      });
    }
  };

  return mockDriver;
};

const findRequestByUrl = (url) => {
  return tracingData.networkRecords.find(record => record._url === url);
};

describe('Start-url gatherer', () => {
  it('returns an artifact set to -1 when offline loading fails', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const options = {
      url: 'https://do-not-match.com/',
      driver: wrapSendCommand(mockDriver, 'https://do-not-match.com/')
    };
    const optionsWithQueryString = {
      url: 'https://ifixit-pwa.appspot.com/?history',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/?history')
    };

    return Promise.all([
      startUrlGatherer.afterPass(options, tracingData).then(artifact => {
        assert.strictEqual(artifact, -1);
      }),
      startUrlGatherer.afterPass(optionsWithQueryString, tracingData).then(artifact => {
        assert.strictEqual(artifact, -1);
      }),
    ]);
  });

  it('returns an artifact set to 200 when offline loading succeeds', () => {
    const startUrlGatherer = new StartUrlGatherer();
    const options = {
      url: 'https://ifixit-pwa.appspot.com/',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/')
    };
    const optionsWithFragment = {
      url: 'https://ifixit-pwa.appspot.com/#/history',
      driver: wrapSendCommand(mockDriver, 'https://ifixit-pwa.appspot.com/#/history')
    };
    return Promise.all([
      startUrlGatherer.afterPass(options, tracingData).then(artifact => {
        assert.strictEqual(artifact, 200);
      }),
      startUrlGatherer.afterPass(optionsWithFragment, tracingData).then(artifact => {
        assert.strictEqual(artifact, 200);
      }),
    ]);
  });
});
