/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const AppleTouchIcon = require('../../audits/apple-touch-icon.js');

/* eslint-env jest */

describe('PWA: apple-touch-icon audit', () => {
  it(`fails when apple-touch-icon is not present`, async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com/'},
      LinkElements: [],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(0);
  });

  it(`fails when apple-touch-icon does not have an href`, async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com/'},
      LinkElements: [{rel: 'apple-touch-icon'}],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(0);
  });

  it(`fails when apple-touch-icon href is invalid`, async () => {
    const artifacts = {
      URL: {finalUrl: 'not-a-base-url'},
      LinkElements: [{rel: 'apple-touch-icon', href: 'not-a-url'}],
    };

    const {score, explanation} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(0);
    expect(explanation).toBeDisplayString('`apple-touch-icon`\'s `href` attribute is not valid');
  });

  it(`warns when apple-touch-icon-precomposed exists`, async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com/'},
      LinkElements: [{rel: 'apple-touch-icon-precomposed', href: 'https://example.com/touch-icon.png'}],
    };

    const {score, warnings} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
    expect(warnings[0]).toBeDisplayString('`apple-touch-icon-precomposed` is ' +
      'out of date, `apple-touch-icon` is preferred.');
  });

  it(`passes when apple-touch-icon is on page`, async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com/'},
      LinkElements: [{rel: 'apple-touch-icon', href: 'https://example.com/touch-icon.png'}],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
  });

  it(`passes when apple-touch-icon is on page with href requiring base_url`, async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com/'},
      LinkElements: [{rel: 'apple-touch-icon', href: 'touch-icon.png'}],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
  });
});
