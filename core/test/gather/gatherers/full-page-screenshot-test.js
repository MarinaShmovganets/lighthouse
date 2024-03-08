/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createMockContext} from '../../gather/mock-driver.js';
import FullPageScreenshotGatherer from '../../../gather/gatherers/full-page-screenshot.js';
import {fnAny} from '../../test-utils.js';

/** @type {{width: number, height: number}} */
let contentSize;
/** @type {{width?: number, height?: number, dpr: number}} */
let screenSize;
/** @type {{width?: number, height?: number}} */
let screenshotSize;
/** @type {string[]} */
let screenshotData;
let mockContext = createMockContext();
let fpsGatherer = new FullPageScreenshotGatherer();

beforeEach(() => {
  fpsGatherer = new FullPageScreenshotGatherer();

  // Prevent `waitForNetworkIdle` from stalling the tests
  fpsGatherer.waitForNetworkIdle = fnAny().mockImplementation(() => ({
    promise: Promise.resolve(),
    cancel: fnAny(),
  }));

  contentSize = {width: 100, height: 100};
  screenSize = {width: 100, height: 100, dpr: 1};
  screenshotSize = contentSize;
  screenshotData = [];
  mockContext = createMockContext();
  mockContext.driver.defaultSession.sendCommand.mockImplementation((method) => {
    if (method === 'Page.getLayoutMetrics') {
      return {
        cssContentSize: contentSize,
        // This is only accessed on the first call to Page.getLayoutMetrics
        // At that time the width and height should match the screen size.
        cssLayoutViewport: {clientWidth: screenSize.width, clientHeight: screenSize.height},
        // This is only accessed on the second call to Page.getLayoutMetrics
        // At that time the width and height should match the screenshot size.
        cssVisualViewport: {clientWidth: screenshotSize.width, clientHeight: screenshotSize.height},
      };
    }
    if (method === 'Page.captureScreenshot') {
      return {
        data: screenshotData?.length ? screenshotData.shift() : 'abc',
      };
    }
  });
  mockContext.driver._executionContext.evaluate.mockImplementation(fn => {
    if (fn.name === 'resolveNodes') {
      return {};
    } else if (fn.name === 'getObservedDeviceMetrics') {
      return {
        width: screenSize.width,
        height: screenSize.height,
        screenOrientation: {
          type: 'landscapePrimary',
          angle: 30,
        },
        deviceScaleFactor: screenSize.dpr,
      };
    } else if (fn.name === 'waitForDoubleRaf') {
      return {};
    } else {
      throw new Error(`unexpected fn ${fn.name}`);
    }
  });
});

describe('FullPageScreenshot gatherer', () => {
  it('captures a full-page screenshot', async () => {
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};
    screenshotSize = contentSize;

    mockContext.settings = {
      ...mockContext.settings,
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    const artifact = await fpsGatherer.getArtifact(mockContext.asContext());

    expect(artifact).toEqual({
      screenshot: {
        data: 'data:image/webp;base64,abc',
        height: 2000,
        width: 412,
      },
      nodes: {},
    });
  });

  it('resets the emulation correctly when Lighthouse controls it', async () => {
    contentSize = {width: 412, height: 2000};
    screenSize = {width: 412, height: 412};
    screenshotSize = contentSize;

    mockContext.settings = {
      ...mockContext.settings,
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    // Lighthouse-controlled emulation.emulate() sets touch emulation.
    const emulationInvocations = mockContext.driver.defaultSession.sendCommand
        .findAllInvocations('Emulation.setTouchEmulationEnabled');
    expect(emulationInvocations).toHaveLength(1);

    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        height: 412,
        width: 412,
        mobile: true,
      })
    );
  });

  it('resets the emulation correctly when Lighthouse does not control it', async () => {
    contentSize = {width: 500, height: 1500};
    screenSize = {width: 500, height: 500, dpr: 2};
    screenshotSize = contentSize;
    mockContext.settings = {
      ...mockContext.settings,
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: true,
      },
      formFactor: 'mobile',
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    // If not Lighthouse controlled, no touch emulation.
    const emulationInvocations = mockContext.driver.defaultSession.sendCommand
        .findAllInvocations('Emulation.setTouchEmulationEnabled');
    expect(emulationInvocations).toHaveLength(0);

    // Setting up for screenshot.
    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 1,
        height: 1500,
        width: 0,
      })
    );

    // Restoring.
    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({
        mobile: true,
        deviceScaleFactor: 2,
        height: 500,
        width: 0,
      })
    );
  });

  it('limits the screenshot height to the max Chrome can capture', async () => {
    contentSize = {width: 412, height: 100000};
    screenSize = {width: 412, height: 412, dpr: 1};
    screenshotSize = contentSize;
    mockContext.settings = {
      ...mockContext.settings,
      formFactor: 'mobile',
      screenEmulation: {
        height: screenSize.height,
        width: screenSize.width,
        mobile: true,
        disabled: false,
      },
    };

    await fpsGatherer.getArtifact(mockContext.asContext());

    expect(mockContext.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
      'Emulation.setDeviceMetricsOverride',
      {
        mobile: true,
        deviceScaleFactor: 1,
        width: 0,
        height: 16383,
      }
    );
  });
});
