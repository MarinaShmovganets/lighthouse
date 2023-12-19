/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * This gatherer collects all network and page devtools protocol traffic during the timespan/navigation.
 * This protocol log can be used to recreate the network records using lib/network-recorder.js.
 */

import BaseGatherer from '../base-gatherer.js';
import {TraceProcessor} from '../../lib/tracehouse/trace-processor.js';
import * as TraceEngine from '../../lib/trace-engine.js';

class Trace extends BaseGatherer {
  /** @type {LH.Trace|null} */
  _trace = null;

  static getDefaultTraceCategories() {
    return [
      // Exclude default categories. We'll be selective to minimize trace size
      '-*',

      // Used instead of 'toplevel' in Chrome 71+
      'disabled-by-default-lighthouse',

      // Used for Cumulative Layout Shift metric
      'loading',

      // All compile/execute events are captured by parent events in devtools.timeline..
      // But the v8 category provides some nice context for only <0.5% of the trace size
      'v8',
      // Same situation here. This category is there for RunMicrotasks only, but with other teams
      // accidentally excluding microtasks, we don't want to assume a parent event will always exist
      'v8.execute',

      // For extracting UserTiming marks/measures
      'blink.user_timing',

      // Not mandatory but not used much
      'blink.console',

      // Most of the events we need are from these two categories
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',

      // Up to 450 (https://goo.gl/rBfhn4) JPGs added to the trace
      'disabled-by-default-devtools.screenshot',

      // This doesn't add its own events, but adds a `stackTrace` property to devtools.timeline events
      'disabled-by-default-devtools.timeline.stack',

      // Additional categories used by devtools. Not used by Lighthouse, but included to facilitate
      // loading traces from Lighthouse into the Performance panel.
      'disabled-by-default-devtools.timeline.frame',
      'latencyInfo',

      // For CLS root causes.
      'disabled-by-default-devtools.timeline.invalidationTracking',

      // Not used by Lighthouse (yet) but included for users that want JS samples when looking at
      // a trace collected by Lighthouse (e.g. "View Trace" workflow in DevTools)
      'disabled-by-default-v8.cpu_profiler',
    ];
  }

  /**
   * @param {LH.Gatherer.Driver} driver
   * @return {Promise<LH.Trace>}
   */
  static async endTraceAndCollectEvents(driver) {
    /** @type {Array<LH.TraceEvent>} */
    const traceEvents = [];
    const session = driver.defaultSession;

    /**
     * Listener for when dataCollected events fire for each trace chunk
     * @param {LH.Crdp.Tracing.DataCollectedEvent} data
     */
    const dataListener = function(data) {
      traceEvents.push(...data.value);
    };
    session.on('Tracing.dataCollected', dataListener);

    await new Promise((resolve, reject) => {
      session.once('Tracing.tracingComplete', _ => {
        session.off('Tracing.dataCollected', dataListener);
        resolve({});
      });

      session.sendCommand('Tracing.end').catch(reject);
    });

    const traceEngineResult = await Trace.runTraceEngine(driver, traceEvents);

    return {traceEvents, traceEngineResult};
  }

  static symbol = Symbol('Trace');

  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    symbol: Trace.symbol,
    supportedModes: ['timespan', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async startSensitiveInstrumentation({driver, gatherMode, settings}) {
    const traceCategories = Trace.getDefaultTraceCategories()
      .concat(settings.additionalTraceCategories || []);
    await driver.defaultSession.sendCommand('DOM.enable');
    await driver.defaultSession.sendCommand('CSS.enable');
    await driver.defaultSession.sendCommand('Page.enable');
    await driver.defaultSession.sendCommand('Tracing.start', {
      categories: traceCategories.join(','),
      options: 'sampling-frequency=10000', // 1000 is default and too slow.
    });

    if (gatherMode === 'timespan') {
      await driver.defaultSession.sendCommand('Tracing.recordClockSyncMarker',
        {syncId: TraceProcessor.TIMESPAN_MARKER_ID});
    }
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async stopSensitiveInstrumentation({driver}) {
    this._trace = await Trace.endTraceAndCollectEvents(driver);
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

  getArtifact() {
    if (!this._trace) {
      throw new Error('unexpected null _trace');
    }

    return this._trace;
  }
}

export default Trace;
