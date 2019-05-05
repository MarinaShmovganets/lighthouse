/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const IosPwaIcon = require('../../audits/ios-pwa-icon.js');

/* eslint-env jest */

describe('PWA: ios-pwa-icon audit', () => {
  it(`fails when apple-touch-icon is not present`, async () => {
    const artifacts = {
      LinkElements: [],
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, explanation} = IosPwaIcon.audit(artifacts, context);

    expect(score).toBe(0);
    expect(explanation).toBeDisplayString('No valid `apple-touch-icon` link found.');
  });

  it(`fails when apple-touch-icon does not have an href`, async () => {
    const artifacts = {
      LinkElements: [{rel: 'apple-touch-icon'}],
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, explanation} = IosPwaIcon.audit(artifacts, context);

    expect(score).toBe(0);
    expect(explanation).toBeDisplayString('No valid `apple-touch-icon` link found.');
  });

  it(`passes when apple-touch-icon is on page`, async () => {
    const artifacts = {
      LinkElements: [{rel: 'apple-touch-icon', href: 'https://example.com/touch-icon.png'}],
    };

    const context = {settings: {}, computedCache: new Map()};
    const {score, explanation} = IosPwaIcon.audit(artifacts, context);

    expect(score).toBe(1);
    expect(explanation).toBeUndefined();
  });
});
