/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';
import * as TraceEngine from '../../lib/trace-engine.js';

class TraceEngineResult extends BaseGatherer {
  static symbol = Symbol('TraceEngineResult');

  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    symbol: TraceEngineResult.symbol,
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol},
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async startSensitiveInstrumentation({driver}) {
    await driver.defaultSession.sendCommand('DOM.enable');
    await driver.defaultSession.sendCommand('CSS.enable');
  }

  /**
   * @param {LH.Gatherer.Driver} driver
   * @param {LH.TraceEvent[]} traceEvents
   */
  static async runTraceEngine(driver, traceEvents) {
    const protocolInterface = {
      /** @param {string} url */
      // eslint-disable-next-line no-unused-vars
      getInitiatorForRequest(url) {
        return null;
      },
      /** @param {number[]} backendNodeIds */
      async pushNodesByBackendIdsToFrontend(backendNodeIds) {
        await driver.defaultSession.sendCommand('DOM.getDocument', {depth: -1, pierce: true});
        const response = await driver.defaultSession.sendCommand(
          'DOM.pushNodesByBackendIdsToFrontend', {backendNodeIds});
        return response.nodeIds;
      },
      /** @param {number} nodeId */
      async getNode(nodeId) {
        const response = await driver.defaultSession.sendCommand('DOM.describeNode', {nodeId});
        // Why is this always zero? Uh, let's fix it here.
        response.node.nodeId = nodeId;
        return response.node;
      },
      /** @param {number} nodeId */
      async getComputedStyleForNode(nodeId) {
        try {
          const response = await driver.defaultSession.sendCommand(
            'CSS.getComputedStyleForNode', {nodeId});
          return response.computedStyle;
        } catch {
          return [];
        }
      },
      /** @param {number} nodeId */
      async getMatchedStylesForNode(nodeId) {
        try {
          const response = await driver.defaultSession.sendCommand(
            'CSS.getMatchedStylesForNode', {nodeId});
          return response;
        } catch {
          return [];
        }
      },
      /** @param {string} url */
      // eslint-disable-next-line no-unused-vars
      async fontFaceForSource(url) {
        return null;
      },
    };

    const engine = TraceEngine.TraceProcessor.createWithAllHandlers();
    await engine.parse(traceEvents);
    const data = engine.data;

    /** @type {LH.TraceEngineRootCauses} */
    const rootCauses = {
      layoutShifts: {},
    };
    const rootCausesEngine = new TraceEngine.RootCauses(protocolInterface);
    const layoutShiftEvents = data.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of layoutShiftEvents) {
      const r = await rootCausesEngine.layoutShifts.rootCausesForEvent(data, event);
      rootCauses.layoutShifts[layoutShiftEvents.indexOf(event)] = r;
    }

    return {
      data,
      rootCauses,
    };
  }

  /**
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    if (!trace) {
      throw new Error('Trace is missing!');
    }

    return TraceEngineResult.runTraceEngine(context.driver, trace.traceEvents);
  }
}

export default TraceEngineResult;
