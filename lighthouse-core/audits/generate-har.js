/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const traceSaverThings = require('./../lib/lantern-trace-saver');
const CHCHar = require('chrome-har-capturer/lib/har');
const Page = require('chrome-har-capturer/lib/page');

class Metrics extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      name: 'generate-har',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      description: 'HAR File',
      helpText: 'Makes a har',
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL']
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    const metricComputationData = {
      trace,
      devtoolsLog,
      settings: context.settings
    };

    const interactive = await artifacts.requestInteractive(
      metricComputationData
    );

    const metric =
      /** @type {LH.Artifacts.LanternMetric} */ interactive.pessimisticEstimate;

    const timings =
      /** @type {LH.Gatherer.Simulation.Result} */ metric.nodeTimings;

    // Get events from full speed trace. Overwrite the timing information on each of the Network.responseRecieved events.

    const simulatedNetworkNodes = Array.from(timings.entries()).filter(
      ([key]) => key.type === 'network'
    );

    const events = devtoolsLog.map(event => {
      if (event.method !== 'Network.responseReceived') return event;

      // Get simulated timings for this request
      const networkNode = simulatedNetworkNodes.find(
        ([key]) => key._id === event.params.requestId
      );

      // Find and update the corresponding Network.responseReceived event
      event.params.response.timing.sendEnd += networkNode[1].duration;

      console.log(
        '+',
        networkNode[1].duration,
        'to',
        event.params.response.url
      );

      return event;
    });

    const har = this.createHarFromEvents(devtoolsLog);

    // const { traceEvents } = traceSaverThings.convertNodeTimingsToTrace(timings);

    // for (const [node] of timings.entries()) {
    //   if (node.type !== "network") continue;

    //   const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
    //   const record = networkNode.record;

    //   // Replace the timings
    //   har.log.entries[index].timings = this.calculateRequestTimings(record);
    // }

    // const harEntries = [];
    // for (const [node, timing] of timings.entries()) {
    //   if (node.type !== "network") continue;

    //   const networkNode = /** @type {LH.Gatherer.Simulation.GraphNetworkNode} */ (node);
    //   const record = networkNode.record;
    //   const lanternTiming = timing;
    //   const queryString = URL.parse(record._url, true).query;

    //   const request = {
    //     method: record.requestMethod,
    //     url: record._url,
    //     httpVersion: record.requestHttpVersion(), // TODO // returns unknown, not sure why at this point
    //     cookies: [], // TODO // record.requestCookies throws an error, will need to follow up on why
    //     headers: record._requestHeaders,
    //     queryString,
    //     headersSize: record._requestHeaders.toString().length, // This isn't really calculatable for h2
    //     bodySize: record._resourceSize
    //     // postData
    //   };

    //   const response = {
    //     status: record.statusCode,
    //     statusText: record.statusText,
    //     httpVersion: record.responseHttpVersion(),
    //     cookies: [], // TODO
    //     headers: record._responseHeaders,
    //     redirectURL: record.redirectSource
    //       ? record.redirectSource.url
    //       : undefined,
    //     headersSize: record._responseHeaders.toString().length,
    //     // bodySize: payload.response.bodySize,
    //     _transferSize: record._resourceSize,
    //     content: {
    //       size: record._resourceSize,
    //       mimeType: record._mimeType
    //       // compression: record.,
    //       // text: entry.responseBody,
    //       // encoding
    //     }
    //   };

    //   // record._timing

    //   const pageRef = 1;
    //   const startedDateTime = undefined; // TODO
    //   const time = record._endTime - record._startTime;
    //   const timings = {};

    //   const entry = {
    //     pageRef,
    //     startedDateTime,
    //     time,
    //     request,
    //     response,
    //     cache: {},
    //     _fromDiskCache: undefined, // TODO
    //     timings,
    //     serverIPAddress: undefined, // TODO
    //     connection: undefined, // TODO
    //     _initiator: record._initiator.type,
    //     _priority: record.priority()
    //   };

    //   harEntries.push(entry);
    // }

    // const pageIndex = 0;
    // const url = artifacts.URL.finalUrl;
    // const devtools = null; // Not required, because we're not using `fetchContent: true`
    // const fetchContent = false;
    // const page = new Page(pageIndex, url, devtools, fetchContent);

    // const har = CHCHar.create([page]);
    // debugger;
    // console.log(traceEvents);

    /** @type {MetricsDetails} */
    const details = {};

    return {
      score: 1,
      rawValue: har,
      details
    };
  }

  static createHarFromEvents(events) {
    const pageIndex = 0;
    const initialRequest = events.find(
      message =>
        message.method === 'Network.requestWillBeSent' &&
        message.params.documentURL
    );
    const url = initialRequest.params.documentURL;
    const devtools = null; // Not required, because we're not using `fetchContent: true`
    const fetchContent = false;
    const page = new Page(pageIndex, url, devtools, fetchContent);

    // Replay all CRI messages through the page instance
    events.forEach(message => {
      try {
        page.processMessage(message);
      } catch (e) {}
    });

    return CHCHar.create([page]);
  }
}

module.exports = Metrics;
