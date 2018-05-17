#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

if (process.argv.length !== 4) {
  console.error('Usage $0: <input file> <output file>');
  process.exit(1);
}

const inputTracePath = path.resolve(process.cwd(), process.argv[2]);
const outputTracePath = path.resolve(process.cwd(), process.argv[3]);
const inputTraceRaw = fs.readFileSync(inputTracePath, 'utf8');
/** @type {LH.Trace} */
const inputTrace = JSON.parse(inputTraceRaw);

const toplevelTaskNames = [
  'TaskQueueManager::ProcessTaskFromWorkQueue',
  'ThreadControllerImpl::DoWork',
];

const traceEventsToAlwaysKeep = new Set([
  'Screenshot',
  'TracingStartedInBrowser',
  'TracingStartedInPage',
  'navigationStart',
  'ParseAuthorStyleSheet',
  'ParseHTML',
  'PlatformResourceSendRequest',
  'ResourceSendRequest',
  'ResourceReceiveResponse',
  'ResourceFinish',
  'ResourceReceivedData',
  'EventDispatch',
]);

const traceEventsToKeepProcess = new Set([
  ...toplevelTaskNames,
  'firstPaint',
  'firstContentfulPaint',
  'firstMeaningfulPaint',
  'firstMeaningfulPaintCandidate',
  'loadEventEnd',
  'domContentLoadedEventEnd',
  'TimerInstall',
  'TimerFire',
  'InvalidateLayout',
  'ScheduleStyleRecalculation',
  'EvaluateScript',
  'XHRReadyStateChange',
  'FunctionCall',
  'v8.compile',
]);

/**
 * @param {LH.TraceEvent[]} events
 */
function filterTraceEvents(events) {
  const startedInPageEvt = events.find(evt => evt.name === 'TracingStartedInPage');
  if (!startedInPageEvt) throw new Error('Could not find TracingStartedInPage');

  const filtered = events.filter(evt => {
    if (toplevelTaskNames.includes(evt.name) && evt.dur < 1000) return false;
    if (evt.pid === startedInPageEvt.pid && traceEventsToKeepProcess.has(evt.name)) return true;
    return traceEventsToAlwaysKeep.has(evt.name);
  });

  const screenshotTimestamps = filtered.filter(evt => evt.name === 'Screenshot').map(evt => evt.ts)

  let lastScreenshotTs = -Infinity;
  const throttled = filtered.filter((evt, index) => {
    if (evt.name !== 'Screenshot') return true;
    const timeSinceLastScreenshot = evt.ts - lastScreenshotTs;
    const nextScreenshotTs = screenshotTimestamps.find(ts => ts > evt.ts);
    const timeUntilNextScreenshot = nextScreenshotTs ? nextScreenshotTs - evt.ts : Infinity;
    const threshold = 500 * 1000; // Throttle to ~2fps
    // Keep the frame if it's been more than 500ms since the last frame we kept or the next frame won't happen for at least 500ms
    const shouldKeep = timeUntilNextScreenshot > threshold || timeSinceLastScreenshot > threshold;
    if (shouldKeep) lastScreenshotTs = evt.ts;
    return shouldKeep;
  });

  return throttled;
}

const filteredEvents = filterTraceEvents(inputTrace.traceEvents);
const output = `{
  "traceEvents": [
${filteredEvents.map(e => '    ' + JSON.stringify(e)).join(',\n')}
  ]
}`;

/** @param {string} s */
const size = s => Math.round(s.length / 1024) + 'kb';
console.log(`Reduced trace from ${size(inputTraceRaw)} to ${size(output)}`);
console.log(`Filtered out ${inputTrace.traceEvents.length - filteredEvents.length} trace events`);
fs.writeFileSync(outputTracePath, output);
