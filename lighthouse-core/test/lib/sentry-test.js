/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

jest.mock('raven');

const raven = require('raven');
const Sentry = require('../../lib/sentry');

/* eslint-env jest */

describe('Sentry', () => {
  let configPayload;
  let originalSentry;
  let originalMathRandom;
  let ravenConfigFn;
  let ravenMergeContextFn;
  let ravenCaptureExceptionFn;
  let mathRandomFn;

  beforeEach(() => {
    configPayload = {
      url: 'http://example.com',
      flags: {enableErrorReporting: true},
      environmentData: {},
    };

    originalSentry = {...Sentry};
    originalMathRandom = Math.random;
    ravenConfigFn = jest.fn().mockReturnValue({install: jest.fn()});
    ravenMergeContextFn = jest.fn();
    ravenCaptureExceptionFn = jest.fn().mockImplementation((err, opts, cb) => cb());
    mathRandomFn = jest.fn().mockReturnValue(0.001);

    Math.random = mathRandomFn;
    raven.config = ravenConfigFn;
    raven.mergeContext = ravenMergeContextFn;
    raven.captureException = ravenCaptureExceptionFn;
  });

  afterEach(() => {
    // Reset the methods on the Sentry object
    Object.assign(Sentry, originalSentry);
    Math.random = originalMathRandom;
  });

  describe('.init', () => {
    it('should noop when !enableErrorReporting', () => {
      Sentry.init({url: 'http://example.com', flags: {}});
      expect(ravenConfigFn).not.toHaveBeenCalled();
      Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: false}});
      expect(ravenConfigFn).not.toHaveBeenCalled();
    });

    it('should noop when not picked for sampling', () => {
      mathRandomFn.mockReturnValue(0.5);
      Sentry.init({url: 'http://example.com', flags: {enableErrorReporting: true}});
      expect(ravenConfigFn).not.toHaveBeenCalled();
    });

    it('should initialize the raven client when enableErrorReporting', () => {
      Sentry.init({
        url: 'http://example.com',
        flags: {
          enableErrorReporting: true,
          emulatedFormFactor: 'desktop',
          throttlingMethod: 'devtools',
        },
        environmentData: {},
      });

      expect(ravenConfigFn).toHaveBeenCalled();
      expect(ravenMergeContextFn).toHaveBeenCalled();
      expect(ravenMergeContextFn.mock.calls[0][0]).toEqual({
        extra: {
          url: 'http://example.com',
          deviceEmulation: true,
          emulatedFormFactor: 'desktop',
          throttlingMethod: 'devtools',
        },
      });
    });
  });

  describe('.captureException', () => {
    it('should forward exceptions to raven client', async () => {
      Sentry.init(configPayload);
      const error = new Error('oops');
      await Sentry.captureException(error);

      expect(ravenCaptureExceptionFn).toHaveBeenCalled();
      expect(ravenCaptureExceptionFn.mock.calls[0][0]).toBe(error);
    });

    it('should skip expected errors', async () => {
      Sentry.init(configPayload);
      const error = new Error('oops');
      error.expected = true;
      await Sentry.captureException(error);

      expect(ravenCaptureExceptionFn).not.toHaveBeenCalled();
    });

    it('should skip duplicate audit errors', async () => {
      Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(error, {tags: {audit: 'my-audit'}});

      expect(ravenCaptureExceptionFn).toHaveBeenCalledTimes(1);
    });

    it('should still allow different audit errors', async () => {
      Sentry.init(configPayload);
      const errorA = new Error('A');
      const errorB = new Error('B');
      await Sentry.captureException(errorA, {tags: {audit: 'my-audit'}});
      await Sentry.captureException(errorB, {tags: {audit: 'my-audit'}});

      expect(ravenCaptureExceptionFn).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate gatherer errors', async () => {
      Sentry.init(configPayload);
      const error = new Error('A');
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});
      await Sentry.captureException(error, {tags: {gatherer: 'my-gatherer'}});

      expect(ravenCaptureExceptionFn).toHaveBeenCalledTimes(1);
    });
  });
});
