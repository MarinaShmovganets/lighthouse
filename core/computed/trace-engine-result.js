/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TraceEngine from '../lib/trace-engine.js';
import {makeComputedArtifact} from './computed-artifact.js';

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
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  static compute_(data) {
    return TraceEngineResult.runTraceEngine(data.trace.traceEvents);
  }
}

const TraceEngineResultComputed = makeComputedArtifact(TraceEngineResult, ['trace']);
export {TraceEngineResultComputed as TraceEngineResult};
