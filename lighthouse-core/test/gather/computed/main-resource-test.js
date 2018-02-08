/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Runner = require('../../../runner.js');
const assert = require('assert');

describe('MainResource computed artifact', () => {
  let computedArtifacts;

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('returns an artifact', () => {
    const record = {
      url: 'https://example.com',
    };
    const networkRecords = [
      record,
    ];
    computedArtifacts.requestNetworkRecords = _ => Promise.resolve(networkRecords);

    return computedArtifacts.requestMainResource({}).then(output => {
      assert.equal(output, record);
    });
  });

  it('thows when main resource can\'t be found', () => {
    const networkRecords = [
    ];
    computedArtifacts.requestNetworkRecords = _ => Promise.resolve(networkRecords);

    return computedArtifacts.requestMainResource({}).then(() => {
      assert.ok(false, 'should have thrown');
    }).catch(err => {
      assert.equal(err.message, 'Unable to identify the main resource');
    });
  });

  it('should ignore redirects', () => {
    const record = {
      url: 'http://example.com/3',
      redirectSource: {
        url: 'http://example.com/2',
      },
    };
    const networkRecords = [
      {
        url: 'http://example.com/1',
      },
      {
        url: 'http://example.com/2',
        redirectSource: {
          url: 'http://example.com/1',
        },
      },
      record,
      {
        url: 'http://example.com/someimage.jpg',
      },
      {
        url: 'https://example.com/someimage.jpg',
        redirectSource: {
          url: 'http://example.com/someimage.jpg',
        },
      },
    ];
    computedArtifacts.requestNetworkRecords = _ => Promise.resolve(networkRecords);

    return computedArtifacts.requestMainResource({}).then(output => {
      assert.equal(output, record);
    });
  });

  it('should identify correct main resource in the wikipedia fixture', () => {
    const wikiDevtoolsLog = require('../../fixtures/wikipedia-redirect.devtoolslog.json');

    return computedArtifacts.requestMainResource(wikiDevtoolsLog).then(output => {
      assert.equal(output.url, 'https://en.m.wikipedia.org/wiki/Main_Page');
    });
  });
});
