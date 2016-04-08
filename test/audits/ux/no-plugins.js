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
const Audit = require('../../../audits/ux/no-plugins.js');
const assert = require('assert');

/* global describe, it*/

describe('Security: No plugins', () => {
  it('fails when no input present', () => {
    return assert.equal(Audit.audit({}).value, false);
  });

  it('fails when there are unsandboxed iframes', () => {
    return assert.equal(Audit.audit({
      url: 'https://example.com',
      sandboxedIframes: false,
      networkRecords: [{
        data: {
          _url: 'https://example.com',
          _responseHeaders: []
        }
      }]
    }).value, false);
  });

  it('fails when no network records provided', () => {
    return assert.equal(Audit.audit({
      networkRecords: null
    }).value, false);
  });

  it('fails when response has no CSP header', () => {
    return assert.equal(Audit.audit({
      url: 'https://example.com',
      sandboxedIframes: true,
      networkRecords: [{
        data: {
          _url: 'https://example.com',
          _responseHeaders: []
        }
      }]
    }).value, false);
  });

  it('fails when response has a CSP header with no object-src value', () => {
    return assert.equal(Audit.audit({
      url: 'https://example.com',
      sandboxedIframes: true,
      networkRecords: [{
        data: {
          _url: 'https://example.com',
          _responseHeaders: [{
            name: 'Content-Security-Policy',
            value: 'wobble'
          }]
        }
      }]
    }).value, false);
  });

  it('fails when response has a CSP header with an object-src value other than "none"', () => {
    return assert.equal(Audit.audit({
      url: 'https://example.com',
      sandboxedIframes: true,
      networkRecords: [{
        data: {
          _url: 'https://example.com',
          _responseHeaders: [{
            name: 'Content-Security-Policy',
            value: 'default-src https://cdn.example.net; child-src \'none\'; object-src \'test\''
          }]
        }
      }]
    }).value, false);
  });

  it('passes when a valid CSP header with an object-src value of "none" is found', () => {
    return assert.equal(Audit.audit({
      url: 'https://example.com',
      sandboxedIframes: true,
      networkRecords: [{
        data: {
          _url: 'https://example.com',
          _responseHeaders: [{
            name: 'Content-Security-Policy',
            value: 'default-src https://cdn.example.net; child-src \'none\'; object-src \'none\''
          }]
        }
      }]
    }).value, true);
  });
});
