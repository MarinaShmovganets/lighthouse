/**
 * @license
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

'use strict';

const ComputedArtifact = require('./computed-artifact');
const fMPAudit = require('../../audits/first-meaningful-paint');

class TraceOfTab extends ComputedArtifact {

  get name() {
    return 'TraceOfTab';
  }

  /**
   * @param {{traceEvents: !Array}} trace
   * @return {!Object}
  */
  compute_(trace) {
    // Parse the trace for our key events and sort them by timestamp.
    const keyEvents = trace.traceEvents.filter(e => {
      return e.cat.includes('blink.user_timing') || e.name === 'TracingStartedInPage';
    }).sort((event0, event1) => event0.ts - event1.ts);

    // The first TracingStartedInPage in the trace is definitely our renderer thread of interest
    // Beware: the tracingStartedInPage event can appear slightly after a navigationStart
    const startedInPageEvt = keyEvents.find(e => e.name === 'TracingStartedInPage');
    // Filter to just events matching the frame ID for sanity
    const frameEvents = keyEvents.filter(e => e.args.frame === startedInPageEvt.args.data.page);

    // Find our first FCP
    const firstFCP = frameEvents.find(e => e.name === 'firstContentfulPaint');
    // Our navStart will be the latest one before fCP.
    const navigationStart = frameEvents.filter(e =>
        e.name === 'navigationStart' && e.ts < firstFCP.ts).pop();

    // fMP will follow at/after the FCP, though we allow some timestamp tolerance
    const firstMeaningfulPaint = frameEvents.find(e =>
        e.name === 'firstMeaningfulPaint' && e.ts >= (firstFCP.ts - fMPAudit.toleranceMs));

    // subset all trace events to just our tab's process (incl threads other than main)
    const allFrameEvents = trace.traceEvents.filter(e => {
      return e.pid === startedInPageEvt.pid;
    }).sort((event0, event1) => event0.ts - event1.ts);

    return {
      traceEvents: allFrameEvents,
      startedInPageEvt: startedInPageEvt,
      navigationStartEvt: navigationStart,
      firstContentfulPaintEvt: firstFCP,
      firstMeaningfulPaintEvt: firstMeaningfulPaint
    };
  }
}

module.exports = TraceOfTab;
