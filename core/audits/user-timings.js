/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import ComputedUserTimings from '../computed/user-timings.js';

const UIStrings = {
  /** Descriptive title of a diagnostic audit that provides details on any timestamps generated by the page. User Timing refers to the 'User Timing API', which enables a website to record specific times as 'marks', or spans of time as 'measures'. */
  title: 'User Timing marks and measures',
  /** Description of a Lighthouse audit that tells the user they may want to use the User Timing API to help measure the performance of aspects of their page load and interaction. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Consider instrumenting your app with the User Timing API to measure your ' +
      'app\'s real-world performance during key user experiences. ' +
      '[Learn more about User Timing marks](https://web.dev/user-timings/).',
  /** [ICU Syntax] Label for an audit identifying the number of User Timing timestamps present in the page. */
  displayValue: `{itemCount, plural,
    =1 {1 user timing}
    other {# user timings}
    }`,
  /** Label for the Type column in the User Timing event data table. User Timing API entries are added by the developer of the web page. The only possible types are 'Mark' and Measure'. */
  columnType: 'Type',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @typedef {{name: string, isMark: true, args: LH.TraceEvent['args'], startTime: number}} MarkEvent */
/** @typedef {{name: string, isMark: false, args: LH.TraceEvent['args'], startTime: number, endTime: number, duration: number}} MeasureEvent */

class UserTimings extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'user-timings',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * @return {Array<string>}
   */
  static get excludedPrefixes() {
    return ['goog_'];
  }

  /**
   * We remove mark/measures entered by third parties not of interest to the user
   * @param {MarkEvent|MeasureEvent} evt
   * @return {boolean}
   */
  static excludeEvent(evt) {
    return UserTimings.excludedPrefixes.every(prefix => !evt.name.startsWith(prefix));
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return ComputedUserTimings.request(trace, context).then(computedUserTimings => {
      const userTimings = computedUserTimings.filter(UserTimings.excludeEvent);
      const tableRows = userTimings.map(item => {
        return {
          name: item.name,
          startTime: item.startTime,
          duration: item.isMark ? undefined : item.duration,
          timingType: item.isMark ? 'Mark' : 'Measure',
        };
      }).sort((itemA, itemB) => {
        if (itemA.timingType === itemB.timingType) {
          // If both items are the same type, sort in ascending order by time
          return itemA.startTime - itemB.startTime;
        } else if (itemA.timingType === 'Measure') {
          // Put measures before marks
          return -1;
        } else {
          return 1;
        }
      });

      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'name', itemType: 'text', text: str_(i18n.UIStrings.columnName)},
        {key: 'timingType', itemType: 'text', text: str_(UIStrings.columnType)},
        {key: 'startTime', itemType: 'ms', granularity: 0.01,
          text: str_(i18n.UIStrings.columnStartTime)},
        {key: 'duration', itemType: 'ms', granularity: 0.01,
          text: str_(i18n.UIStrings.columnDuration)},
      ];

      const details = Audit.makeTableDetails(headings, tableRows);

      let displayValue;
      if (userTimings.length) {
        displayValue = str_(UIStrings.displayValue, {itemCount: userTimings.length});
      }

      return {
        // mark the audit as notApplicable if there were no user timings
        score: Number(userTimings.length === 0),
        notApplicable: userTimings.length === 0,
        displayValue,
        details,
      };
    });
  }
}

export default UserTimings;
export {UIStrings};
