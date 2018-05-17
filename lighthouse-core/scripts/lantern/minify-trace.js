#!/usr/bin/env node

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

const includedTraceEventNames = new Set([
  ...toplevelTaskNames,
  'Screenshot',
  'TracingStartedInBrowser',
  'TracingStartedInPage',
  'navigationStart',
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
  'ParseAuthorStyleSheet',
  'ResourceSendRequest',
]);

/**
 * @param {LH.TraceEvent[]} events
 */
function filterTraceEvents(events) {
  const startedInPageEvt = events.find(evt => evt.name === 'TracingStartedInPage');
  if (!startedInPageEvt) throw new Error('Could not find TracingStartedInPage');

  return events.filter(evt => {
    if (evt.name === 'Screenshot') return true;
    if (evt.pid !== startedInPageEvt.pid || !includedTraceEventNames.has(evt.name)) return false;
    return !toplevelTaskNames.includes(evt.name) || evt.dur > 1000;
  });
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
