/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TraceEngine from '../lib/trace-engine.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {ProcessedTrace} from './processed-trace.js';

/**
 * @fileoverview Processes trace with the shared trace engine.
 */
class TraceEngineResult {
  /**
   * @param {LH.TraceEvent[]} traceEvents
   */
  static async runTraceEngine(traceEvents) {
    const engine = new TraceEngine.TraceProcessor({
      AuctionWorklets: TraceEngine.TraceHandlers.AuctionWorklets,
      Initiators: TraceEngine.TraceHandlers.Initiators,
      LayoutShifts: TraceEngine.TraceHandlers.LayoutShifts,
      NetworkRequests: TraceEngine.TraceHandlers.NetworkRequests,
      Renderer: TraceEngine.TraceHandlers.Renderer,
      Samples: TraceEngine.TraceHandlers.Samples,
      Screenshots: TraceEngine.TraceHandlers.Screenshots,
    });
    await engine.parse(traceEvents);
    return engine.data;
  }

  /**
   * @param {{trace: LH.Trace}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  static async compute_(data, context) {
    // Avoid modifying the input array.
    const traceEvents = [...data.trace.traceEvents];

    // Only need ProcessedTrace for some timestamps.
    const processedTrace = await ProcessedTrace.request(data.trace, context);
    let viewportChangeTs = processedTrace.timestamps.timeOrigin;
    const firstViewportEvent = processedTrace.frameEvents.find(event => event.name === 'viewport');
    if (firstViewportEvent) {
      viewportChangeTs = firstViewportEvent.ts;
    }

    // In CumulativeLayoutShift.getLayoutShiftEvents we handle a bug in Chrome layout shift
    // trace events re: changing the viewport emulation resulting in incorrectly set `had_recent_input`.
    // Below, the same logic is applied to set those problem events' `had_recent_input` to false, so that
    // the trace engine will count them.
    // The trace events are copied-on-write, so the original trace remains unmodified.
    for (let i = 0; i < traceEvents.length; i++) {
      let event = traceEvents[i];
      if (event.name !== 'LayoutShift') continue;
      if (!event.args.data) continue;

      // Chromium will set `had_recent_input` if there was recent user input, which
      // skips shift events from contributing to CLS. This flag is also set when
      // Lighthouse changes the emulation size. This results in the first few shift
      // events having `had_recent_input` set, so ignore it for those events.
      // See https://bugs.chromium.org/p/chromium/issues/detail?id=1094974.

      // Even if emulation was applied before navigating, Chrome will issue a viewport
      // change event after a navigation starts which is treated as an interaction when
      // deciding the `had_recent_input` flag. Anything within 500ms of this event should
      // always be counted for CLS regardless of the `had_recent_input` flag.
      // See https://bugs.chromium.org/p/chromium/issues/detail?id=1302667
      const RECENT_INPUT_WINDOW = 500;

      if (event.args.data.had_recent_input) {
        const timing = (event.ts - viewportChangeTs) / 1000;
        if (timing > RECENT_INPUT_WINDOW) continue;
      } else {
        // Found something marked w/o recent input, so we're done here.
        break;
      }

      event = JSON.parse(JSON.stringify(event));
      // @ts-expect-error impossible for data to be missing.
      event.args.data.had_recent_input = false;
      traceEvents[i] = event;
    }

    return TraceEngineResult.runTraceEngine(traceEvents);
  }
}

const TraceEngineResultComputed = makeComputedArtifact(TraceEngineResult, ['trace']);
export {TraceEngineResultComputed as TraceEngineResult};
