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

const GeolocationOnStartAudit = require('../../../audits/dobetterweb/geolocation-on-start.js');
const assert = require('assert');

/* eslint-env mocha */

describe('UX: geolocation audit', () => {
  it('fails when geolocation has been automatically requested', () => {
    const text = 'Do not request geolocation permission without a user action.';

    const auditResult = GeolocationOnStartAudit.audit({
      ChromeConsoleMessages: [
        {entry: {source: 'violation', url: 'https://example.com/', text}},
        {entry: {source: 'violation', url: 'https://example2.com/two', text}},
        {entry: {source: 'violation', url: 'http://abc.com/', text: 'No document.write'}},
        {entry: {source: 'deprecation', url: 'https://example.com/two'}},
      ],
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.extendedInfo.value.length, 2);
    assert.equal(auditResult.details.items.length, 2);
  });

  it('passes when geolocation has not been automatically requested', () => {
    const auditResult = GeolocationOnStartAudit.audit({
      GeolocationOnStart: []
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.extendedInfo.value.length, 0);
    assert.equal(auditResult.details.items.length, 0);
  });
});
