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

// const DevtoolsTimelineModel = require('../lib/traces/devtools-timeline-model');

const FAILURE_MESSAGE = 'Navigation and first paint timings not found.';

// Time to First Meaningful Paint: a layout-based approach
// https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/edit

// we need trace events like https://codereview.chromium.org/1773633003 to land first.
class FMP {
  /**
   * @param {!Array<!Object>} traceData
   */
  static parse(traceData) {
    return new Promise((resolve, reject) => {
      if (!traceData || !Array.isArray(traceData)) {
        return reject(new Error(FAILURE_MESSAGE));
      }

      let mainFrameID;
      let navigationStart;
      let firstContentfulPaintEvt;
      let layouts = new Map();
      let paints = [];

      // const model = new DevtoolsTimelineModel(traceData);
      // const events = model.timelineModel().mainThreadEvents();
      const events = traceData;

      // Parse the trace for our key events
      events.filter(e => {
        return e.cat.includes('blink.user_timing') ||
          e.name === 'FrameView::performLayout' ||
          e.name === 'Paint';
      })
      .forEach(event => {
        // navigationStart == the network begins fetching the page URL
        // CommitLoad == the first bytes of HTML are returned and Chrome considers
        //   the navigation a success. A 'isMainFrame' boolean is attached to those events
        //   However, that flag may be incorrect now, so we're ignoring it.
        if (event.name === 'navigationStart' && !navigationStart) {
          mainFrameID = event.args.frame;
          navigationStart = event;
        }
        // firstContentfulPaint == the first time that text or image content was
        // painted. See src/third_party/WebKit/Source/core/paint/PaintTiming.h
        if (event.name === 'firstContentfulPaint' && event.args.frame === mainFrameID) {
          firstContentfulPaintEvt = event;
        }
        // COMPAT: frame argument requires Chrome 52 (r390306)
        // codereview.chromium.org/1922823003
        if (event.name === 'FrameView::performLayout' && event.args.counters && event.args.counters.frame === mainFrameID) {
          layouts.set(event, event.args.counters);
        }

        if (event.name === 'Paint' && event.args.data.frame === mainFrameID) {
          paints.push(event);
        }
      });

      function firstContentfulPaint() {
        return (firstContentfulPaintEvt.ts - navigationStart.ts) / 1000;
      }

      function firstMeaningfulPaint(heuristics) {
        let layoutTime = 0;
        let maxSoFar = 0;
        let pending = 0;
        let paintTime;
        let significance;
        layouts.forEach((counters, layoutEvent) => {
          if (!counters['host'] || counters['visibleHeight'] === 0) {
            return;
          }

          layouts = counters['LayoutObjectsThatHadNeverHadLayout'] || 0;

          significance = ('pageHeight' in heuristics) ? (layouts / heightRatio(counters)) : layouts;

          if ('webFont' in heuristics && counters['hasBlankText']) {
            pending += significance;
          } else {
            significance += pending;
            pending = 0;
            if (significance > maxSoFar) {
              maxSoFar = significance;
              layoutTime = layoutEvent.ts;
            }
          }
        });
        paintTime = paints.find(e => e.ts > layoutTime).ts;
        return (paintTime - navigationStart.ts) / 1000;
      }

      function heightRatio(counters) {
        const ratioBefore = Math.max(1, counters['contentsHeightBeforeLayout'].to_f / counters['visibleHeight']);
        const ratioAfter = Math.max(1, counters['contentsHeightAfterLayout'].to_f / counters['visibleHeight']);
        return (ratioBefore + ratioAfter) / 2;
      }

      /* eslint-disable key-spacing */

      const fcp =           firstContentfulPaint();
      const fmpBasic =      firstMeaningfulPaint();
      const fmpPageHeight = firstMeaningfulPaint({ pageHeight: true });
      const fmpWebFont = firstMeaningfulPaint({ webFont: true });
      const fmpFull = firstMeaningfulPaint({ pageHeight: true, webFont: true });
      var results = {};
      /* eslint-enable key-spacing */
      console.log('EFF EMM PEE', results);

      return resolve(function () {

      });
    });
  }
}

module.exports = FMP;
