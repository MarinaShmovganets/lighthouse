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

const FAILURE_MESSAGE = 'Navigation and first paint timings not found.';

// Time to First Meaningful Paint: a layout-based approach
// https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/edit
class FMP {

  /**
   * @param {!Array<!Object>} traceData
   */
  static parse(traceData) {
    return new Promise((resolve, reject) => {
      if (!traceData || !Array.isArray(traceData)) {
        return reject(new Error(FAILURE_MESSAGE));
      }

      const evts = this.collectEvents(traceData);

      /* eslint-disable no-multi-spaces  */
      const navStart =      evts.navigationStart;
      const fCP =           evts.firstContentfulPaint;
      const fMPbasic =      this.firstMeaningfulPaint(evts, {});
      const fMPpageheight = this.firstMeaningfulPaint(evts, {pageHeight: true});
      const fMPwebfont =    this.firstMeaningfulPaint(evts, {webFont: true});
      const fMPfull =       this.firstMeaningfulPaint(evts, {pageHeight: true, webFont: true});
      /* eslint-enable no-multi-spaces */

      var results = {
        navStart,
        fmpCandidates: [
          fCP,
          fMPbasic,
          fMPpageheight,
          fMPwebfont,
          fMPfull
        ]
      };
      return resolve(results);
    });
  }

  /**
   * @param {!Array<!Object>} traceData
   */
  static collectEvents(traceData) {
    let mainFrameID;
    let navigationStart;
    let firstContentfulPaint;
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
    }).forEach(event => {
      // navigationStart == the network begins fetching the page URL
      if (event.name === 'navigationStart' && !navigationStart) {
        mainFrameID = event.args.frame;
        navigationStart = event;
      }
      // firstContentfulPaint == the first time that text or image content was
      // painted. See src/third_party/WebKit/Source/core/paint/PaintTiming.h
      if (event.name === 'firstContentfulPaint' && event.args.frame === mainFrameID) {
        firstContentfulPaint = event;
      }
      // COMPAT: frame property requires Chrome 52 (r390306)
      // https://codereview.chromium.org/1922823003
      if (event.name === 'FrameView::performLayout' && event.args.counters &&
          event.args.counters.frame === mainFrameID) {
        layouts.set(event, event.args.counters);
      }

      if (event.name === 'Paint' && event.args.data.frame === mainFrameID) {
        paints.push(event);
      }
    });

    return {
      navigationStart,
      firstContentfulPaint,
      layouts,
      paints
    };
  }

  /**
   * @param  {any} evts
   */
  static firstContentfulPaint(evts) {
    return (evts.firstContentfulPaint.ts - evts.navigationStart.ts) / 1000;
  }

  /**
   * @param  {any} evts
   * @param  {any} heuristics
   */
  static firstMeaningfulPaint(evts, heuristics) {
    let mostSignificantLayout;
    let significance = 0;
    let maxSignificanceSoFar = 0;
    let pending = 0;

    evts.layouts.forEach((countersObj, layoutEvent) => {
      const counter = val => countersObj[val];

      function heightRatio() {
        const ratioBefore = counter('contentsHeightBeforeLayout') / counter('visibleHeight');
        const ratioAfter = counter('contentsHeightAfterLayout') / counter('visibleHeight');
        return (max(1, ratioBefore) + max(1, ratioAfter)) / 2;
      }

      if (!counter('host') || counter('visibleHeight') === 0) {
        return;
      }

      const layoutCount = counter('LayoutObjectsThatHadNeverHadLayout') || 0;
      // layout significance = number of layout objects added / max(1, page height / screen height)
      significance = (heuristics.pageHeight) ? (layoutCount / heightRatio()) : layoutCount;

      if (heuristics.webFont && counter('hasBlankText')) {
        pending += significance;
      } else {
        significance += pending;
        pending = 0;
        if (significance > maxSignificanceSoFar) {
          maxSignificanceSoFar = significance;
          mostSignificantLayout = layoutEvent;
        }
      }
    });

    const paintAfterMSLayout = evts.paints.find(e => e.ts > mostSignificantLayout.ts);
    return paintAfterMSLayout;
  }
}

module.exports = FMP;

/**
 * Math.max, but with NaN values removed
 */
function max() {
  const args = [...arguments].filter(val => !isNaN(val));
  return Math.max.apply(Math, args);
}
