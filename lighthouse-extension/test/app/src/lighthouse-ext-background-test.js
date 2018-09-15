/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const lhBackground = require('../../../app/src/lighthouse-ext-background.js');
const LHError = require('../../../../lighthouse-core/lib/lh-error.js');

/* eslint-env mocha */

describe('lighthouse-ext-background', () => {
  it('returns a runtimeError LHR when lighthouse run throws a runtimeError', async () => {
    const connectionError = new LHError(LHError.errors.FAILED_DOCUMENT_REQUEST);
    assert.strictEqual(connectionError.lhrRuntimeError, true);
    const mockConnection = {
      async connect() {
        throw connectionError;
      },
      async disconnect() {},
      async sendCommand() {},
      on() {},
    };
    const url = 'https://example.com';

    const result = await lhBackground.runLighthouseInLR(mockConnection, url, {output: 'json'}, {});
    const parsedResult = JSON.parse(result);
    assert.strictEqual(parsedResult.runtimeError.code, connectionError.code);
    assert.ok(parsedResult.runtimeError.message.includes(connectionError.friendlyMessage));
  });
});
