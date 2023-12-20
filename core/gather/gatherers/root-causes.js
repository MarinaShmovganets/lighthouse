/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';
import * as TraceEngine from '../../lib/trace-engine.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';

class RootCauses extends BaseGatherer {
  static symbol = Symbol('RootCauses');

  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    symbol: RootCauses.symbol,
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
   * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
   * @return {Promise<LH.Artifacts.TraceEngineRootCauses>}
   */
  static async runRootCauseAnalysis(driver, traceEngineResult) {
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
        try {
          const response = await driver.defaultSession.sendCommand('DOM.describeNode', {nodeId});
          // Why is this always zero? Uh, let's fix it here.
          response.node.nodeId = nodeId;
          return response.node;
        } catch (err) {
          if (err.message.includes('Could not find node with given id')) {
            // TODO: when injecting an iframe, the engine gets the node of that frame's document element.
            // But we don't have a way to access that frame. We just have our default session.
            // Ex:
            // node cli http://localhost:10503/shift-attribution.html --quiet --only-audits layout-shifts
            // To fix we must:
            // - Change trace engine `getNode` protocol interface to also give frame id
            // - Expand our driver.targetManager to know how to talk to a session connected to a specific frame
            // When this is fixed, remove this try/catch.
            // Note: this could be buggy by giving the wrong node detail if a node id meant for a non-main frame
            // happens to match one from the main frame ... which is pretty likely...
            return null;
          }
          throw err;
        }
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

    /** @type {LH.Artifacts.TraceEngineRootCauses} */
    const rootCauses = {
      layoutShifts: {},
    };
    const rootCausesEngine = new TraceEngine.RootCauses(protocolInterface);
    const layoutShiftEvents = traceEngineResult.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of layoutShiftEvents) {
      const r = await rootCausesEngine.layoutShifts.rootCausesForEvent(traceEngineResult, event);
      rootCauses.layoutShifts[layoutShiftEvents.indexOf(event)] = r;
    }

    return rootCauses;
  }

  /**
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts.TraceEngineRootCauses>}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    if (!trace) {
      throw new Error('Trace is missing!');
    }

    const traceEngineResult = await TraceEngineResult.request({trace}, context);
    return RootCauses.runRootCauseAnalysis(context.driver, traceEngineResult);
  }
}

export default RootCauses;
