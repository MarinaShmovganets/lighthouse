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
   * @override
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'user-timings',
      description: 'User Timing measures',
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

    let timingsCount = 0;
    let navigationStart;
    let measureEventMap = {};
    let traceStart = false;
    // Fetch blink.user_timing events from the tracing data
    const timelineModel = new TimelineModel(artifacts.traceContents);
    const modeledTraceData = timelineModel.timelineModel();
    let userTimings = [];
    modeledTraceData.mainThreadEvents().filter(
      // Get all blink.user_timing events
      ut => ut.hasCategory('blink.user_timing') || ut.name === 'TracingStartedInPage'
    ).forEach(ut => {
        if (ut.phase === 'R' || ut.phase === 'I') {
          // Mark event
          if (ut.name === 'TracingStartedInPage' && !traceStart) {
            traceStart = true;
            return;
          }
          if (ut.name === 'navigationStart' && traceStart & !navigationStart) {
            navigationStart = ut.startTime;
          }

          userTimings.push({
            name: ut.name,
            isMark: true,        // defines type of performance metric
            args: ut.args,
            startTime: ut.startTime
          });
        } else if (ut.phase === 'b') {
          // Beginning of measure event
          measureEventMap[ut.name] = ut.startTime;
        } else if (ut.phase === 'e') {
          // End of measure event
          userTimings.push({
            name: ut.name,
            isMark: false,
            args: ut.args,
            startTime: measureEventMap[ut.name],
            duration: ut.startTime - measureEventMap[ut.name],
            endTime: ut.startTime
          });
        } else {
          // End
          console.log("Got a strange event:");
          console.log(ut);
        }
      }
    );

    userTimings.forEach(ut => {
      ut.startTime = (ut.startTime - navigationStart).toFixed(2) + 'ms';
      if (!ut.isMark) {
        ut.endTime = (ut.endTime - navigationStart).toFixed(2) + 'ms';
        ut.duration = ut.duration.toFixed(2) + 'ms';
      }
    });

    timingsCount = userTimings.length;

    return UserTimings.generateAuditResult({
      value: timingsCount,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.USER_TIMINGS,
        value: userTimings
      }
    });
  }
}

module.exports = UserTimings;
