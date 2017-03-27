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

const Audit = require('../../audits/is-on-https.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Security: HTTPS audit', () => {
  function getArtifacts(networkRecords) {
    return {networkRecords: {defaultPass: networkRecords}};
  }

  it('fails when there is one record not on HTTPS', () => {
    const result = Audit.audit(getArtifacts([
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'http://insecure.com/image.jpeg', scheme: 'http', domain: 'insecure.com'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ]));
    assert.strictEqual(result.rawValue, false);
    assert.ok(result.debugString.includes('insecure.com/image.jpeg'));
  });

  it('passes when all records on HTTPS', () => {
    const result = Audit.audit(getArtifacts([
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'https://secure.com/image.jpeg', scheme: 'https', domain: 'secure.com'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ]));

    assert.strictEqual(result.rawValue, true);
  });

  it('passes when all records on localhost or HTTPS', () => {
    const result = Audit.audit(getArtifacts([
      {url: 'http://localhost:8080/index.html', scheme: 'https', domain: 'localhost'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
      {url: 'https://google.com/', scheme: 'https', domain: 'google.com'},
    ]));

    assert.strictEqual(result.rawValue, true);
  });
});
