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
      id: 'generate-har',
      title: 'Generates a HAR file containing requests that were made during the gather phase',
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

    // Get events from full speed trace. Overwrite the timing information on each of the Network.(requestWillBeSent||loadingFinished||loadingFailed) events.
    const initialDocumentRequest = devtoolsLog.find(event => {
      return event.method === 'Network.requestWillBeSent' && event.params.documentURL;
    });

    const initialDocumentResponse = devtoolsLog.find(event => {
      return (
        event.method === 'Network.responseReceived' &&
        event.params.requestId === initialDocumentRequest.params.requestId
      )
    });

    const initialDocumentRequestTime = initialDocumentResponse.params.response.timing.requestTime;

    const simulatedNetworkNodes = Array.from(timings.entries()).filter(
      ([key]) => key.type === 'network'
    );

    const shiftedRequestTimestamp = (networkEvent, timing) => {
      const simulatedRequest = simulatedNetworkNodes.find(
        ([key]) => key._id === networkEvent.params.requestId
      );

      const [networkRecord, timings] = simulatedRequest;

      return initialDocumentRequestTime + timings[timing] / 1000;
    };

    const events = devtoolsLog.map(event => {
      switch (event.method) {
        case 'Network.requestWillBeSent':
          event.params.timestamp = shiftedRequestTimestamp(event, 'startTime');
          break;
        case 'Network.loadingFinished':
          event.params.timestamp = shiftedRequestTimestamp(event, 'endTime');
          break;
        case 'Network.loadingFailed':
          event.params.timestamp = shiftedRequestTimestamp(event, 'endTime');
          break;
        case 'Network.responseReceived':
          event.params.response.timing.requestTime = shiftedRequestTimestamp(event, 'startTime');
          break;
        default:
      }

      return event;
    });

    const har = this.createHarFromEvents(devtoolsLog);
    console.log(JSON.stringify(har, null, 2))

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
