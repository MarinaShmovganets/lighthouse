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

const Audit = require('../audit');
const Formatter = require('../../../formatters/formatter');
const TimelineModel = require('../../lib/traces/devtools-timeline-model');

const FAILURE_MESSAGE = 'Trace data not found.';

class UserTimings extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'user-timings',
      description: 'User Timing marks and measures',
      requiredArtifacts: ['traceContents']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (!artifacts.traceContents || !Array.isArray(artifacts.traceContents)) {
      return UserTimings.generateAuditResult({
        value: -1,
        debugString: FAILURE_MESSAGE
      });
    }

    let userTimings = [];
    let navigationStartTime;
    let measuresStartTimes = {};
    let traceStart = false;

    // Fetch blink.user_timing events from the tracing data
    const timelineModel = new TimelineModel(artifacts.traceContents);
    const modeledTraceData = timelineModel.timelineModel();

    // Get all blink.user_timing events
    // The event phases we are interested in are mark and instant events (R, i, I)
    // and duration events which correspond to measures (B, b, E, e).
    // @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview#
    modeledTraceData.mainThreadEvents()
    .filter(ut => ut.hasCategory('blink.user_timing') || ut.name === 'TracingStartedInPage')
    .forEach(ut => {
      if (ut.phase === 'R' || ut.phase.toUpperCase() === 'I') {
        // Mark event
        if (ut.name === 'TracingStartedInPage' && !traceStart) {
          traceStart = true;
          return;
        }
        if (ut.name === 'navigationStart' && traceStart & !navigationStartTime) {
          navigationStartTime = ut.startTime;
        }

        if (!ut.args.hasOwnProperty('frame') && ut.name !== 'requestStart') {
          userTimings.push({
            name: ut.name,
            isMark: true,        // defines type of performance metric
            args: ut.args,
            startTime: ut.startTime
          });
        }
      } else if (ut.phase.toLowerCase() === 'b') {
        // Beginning of measure event
        measuresStartTimes[ut.name] = ut.startTime;
      } else if (ut.phase.toLowerCase() === 'e') {
        // End of measure event
        if (!ut.args.hasOwnProperty('frame') && ut.name !== 'requestStart') {
          userTimings.push({
            name: ut.name,
            isMark: false,
            args: ut.args,
            startTime: measuresStartTimes[ut.name],
            duration: ut.startTime - measuresStartTimes[ut.name],
            endTime: ut.startTime
          });
        }
      }
    });

    userTimings.forEach(ut => {
      ut.startTime = (ut.startTime - navigationStartTime).toFixed(2);
      if (!ut.isMark) {
        ut.endTime = (ut.endTime - navigationStartTime).toFixed(2);
        ut.duration = ut.duration.toFixed(2);
      }
    });

    return UserTimings.generateAuditResult({
      value: userTimings.length,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.USER_TIMINGS,
        value: userTimings
      }
    });
  }
}

module.exports = UserTimings;
