/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {Util} from '../../shared/util.js';
import {Globals} from './report-globals.js';

const SCREENSHOT_PREFIX = 'data:image/jpeg;base64,';
const RATINGS = Util.RATINGS;

class ReportUtils {
  /**
   * Returns a new LHR that's reshaped for slightly better ergonomics within the report rendereer.
   * Also, sets up the localized UI strings used within renderer and makes changes to old LHRs to be
   * compatible with current renderer.
   * The LHR passed in is not mutated.
   * TODO(team): we all agree the LHR shape change is technical debt we should fix
   * @param {LH.Result} result
   * @return {LH.ReportResult}
   */
  static prepareReportResult(result) {
    // If any mutations happen to the report within the renderers, we want the original object untouched
    const clone = /** @type {LH.ReportResult} */ (JSON.parse(JSON.stringify(result)));

    // If LHR is older (≤3.0.3), it has no locale setting. Set default.
    if (!clone.configSettings.locale) {
      clone.configSettings.locale = 'en';
    }
    if (!clone.configSettings.formFactor) {
      // @ts-expect-error fallback handling for emulatedFormFactor
      clone.configSettings.formFactor = clone.configSettings.emulatedFormFactor;
    }

    clone.finalDisplayedUrl = Util.getFinalDisplayedUrl(clone);
    clone.mainDocumentUrl = Util.getMainDocumentUrl(clone);

    for (const audit of Object.values(clone.audits)) {
      // Turn 'not-applicable' (LHR <4.0) and 'not_applicable' (older proto versions)
      // into 'notApplicable' (LHR ≥4.0).
      // @ts-expect-error tsc rightly flags that these values shouldn't occur.
      // eslint-disable-next-line max-len
      if (audit.scoreDisplayMode === 'not_applicable' || audit.scoreDisplayMode === 'not-applicable') {
        audit.scoreDisplayMode = 'notApplicable';
      }

      if (audit.details) {
        // Turn `auditDetails.type` of undefined (LHR <4.2) and 'diagnostic' (LHR <5.0)
        // into 'debugdata' (LHR ≥5.0).
        // @ts-expect-error tsc rightly flags that these values shouldn't occur.
        if (audit.details.type === undefined || audit.details.type === 'diagnostic') {
          // @ts-expect-error details is of type never.
          audit.details.type = 'debugdata';
        }

        // Add the jpg data URL prefix to filmstrip screenshots without them (LHR <5.0).
        if (audit.details.type === 'filmstrip') {
          for (const screenshot of audit.details.items) {
            if (!screenshot.data.startsWith(SCREENSHOT_PREFIX)) {
              screenshot.data = SCREENSHOT_PREFIX + screenshot.data;
            }
          }
        }

        // Circa 10.0, table items were refactored.
        if (audit.details.type === 'table') {
          for (const heading of audit.details.headings) {
            /** @type {{itemType: LH.Audit.Details.ItemValueType|undefined, text: string|undefined}} */
            // @ts-expect-error
            const {itemType, text} = heading;
            if (itemType !== undefined) {
              heading.valueType = itemType;
              // @ts-expect-error
              delete heading.itemType;
            }
            if (text !== undefined) {
              heading.label = text;
              // @ts-expect-error
              delete heading.text;
            }

            // @ts-expect-error
            const subItemsItemType = heading.subItemsHeading?.itemType;
            if (heading.subItemsHeading && subItemsItemType !== undefined) {
              heading.subItemsHeading.valueType = subItemsItemType;
              // @ts-expect-error
              delete heading.subItemsHeading.itemType;
            }
          }
        }

        // TODO: convert printf-style displayValue.
        // Added:   #5099, v3
        // Removed: #6767, v4
      }
    }

    // For convenience, smoosh all AuditResults into their auditRef (which has just weight & group)
    if (typeof clone.categories !== 'object') throw new Error('No categories provided.');

    /** @type {Map<string, Array<LH.ReportResult.AuditRef>>} */
    const relevantAuditToMetricsMap = new Map();

    // This backcompat converts old LHRs (<9.0.0) to use the new "hidden" group.
    // Old LHRs used "no group" to identify audits that should be hidden in performance instead of the "hidden" group.
    // Newer LHRs use "no group" to identify opportunities and diagnostics whose groups are assigned by details type.
    const [majorVersion] = clone.lighthouseVersion.split('.').map(Number);
    const perfCategory = clone.categories['performance'];
    if (majorVersion < 9 && perfCategory) {
      if (!clone.categoryGroups) clone.categoryGroups = {};
      clone.categoryGroups['hidden'] = {title: ''};
      for (const auditRef of perfCategory.auditRefs) {
        if (!auditRef.group) {
          auditRef.group = 'hidden';
        } else if (['load-opportunities', 'diagnostics'].includes(auditRef.group)) {
          delete auditRef.group;
        }
      }
    }

    for (const category of Object.values(clone.categories)) {
      // Make basic lookup table for relevantAudits
      category.auditRefs.forEach(metricRef => {
        if (!metricRef.relevantAudits) return;
        metricRef.relevantAudits.forEach(auditId => {
          const arr = relevantAuditToMetricsMap.get(auditId) || [];
          arr.push(metricRef);
          relevantAuditToMetricsMap.set(auditId, arr);
        });
      });

      category.auditRefs.forEach(auditRef => {
        const result = clone.audits[auditRef.id];
        auditRef.result = result;

        // Attach any relevantMetric auditRefs
        if (relevantAuditToMetricsMap.has(auditRef.id)) {
          auditRef.relevantMetrics = relevantAuditToMetricsMap.get(auditRef.id);
        }

        // attach the stackpacks to the auditRef object
        if (clone.stackPacks) {
          clone.stackPacks.forEach(pack => {
            if (pack.descriptions[auditRef.id]) {
              auditRef.stackPacks = auditRef.stackPacks || [];
              auditRef.stackPacks.push({
                title: pack.title,
                iconDataURL: pack.iconDataURL,
                description: pack.descriptions[auditRef.id],
              });
            }
          });
        }
      });
    }

    // Add some minimal stuff so older reports still work.
    if (!clone.environment) {
      // @ts-expect-error
      clone.environment = {benchmarkIndex: 0};
    }
    if (!clone.configSettings.screenEmulation) {
      // @ts-expect-error
      clone.configSettings.screenEmulation = {};
    }
    if (!clone.i18n) {
      // @ts-expect-error
      clone.i18n = {};
    }

    // In 10.0, full-page-screenshot became a top-level property on the LHR.
    if (clone.audits['full-page-screenshot']) {
      const details = /** @type {LH.Result.FullPageScreenshot=} */ (
        clone.audits['full-page-screenshot'].details);
      if (details) {
        clone.fullPageScreenshot = {
          screenshot: details.screenshot,
          nodes: details.nodes,
        };
      } else {
        clone.fullPageScreenshot = null;
      }
      delete clone.audits['full-page-screenshot'];
    }

    return clone;
  }

  /**
   * @param {LH.Result['configSettings']} settings
   * @return {!{deviceEmulation: string, screenEmulation?: string, networkThrottling: string, cpuThrottling: string, summary: string}}
   */
  static getEmulationDescriptions(settings) {
    let cpuThrottling;
    let networkThrottling;
    let summary;

    const throttling = settings.throttling;
    const i18n = Globals.i18n;
    const strings = Globals.strings;

    switch (settings.throttlingMethod) {
      case 'provided':
        summary = networkThrottling = cpuThrottling = strings.throttlingProvided;
        break;
      case 'devtools': {
        const {cpuSlowdownMultiplier, requestLatencyMs} = throttling;
        // eslint-disable-next-line max-len
        cpuThrottling = `${i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (DevTools)`;
        networkThrottling = `${i18n.formatMilliseconds(requestLatencyMs)} HTTP RTT, ` +
          `${i18n.formatKbps(throttling.downloadThroughputKbps)} down, ` +
          `${i18n.formatKbps(throttling.uploadThroughputKbps)} up (DevTools)`;

        const isSlow4G = () => {
          return requestLatencyMs === 150 * 3.75 &&
            throttling.downloadThroughputKbps === 1.6 * 1024 * 0.9 &&
            throttling.uploadThroughputKbps === 750 * 0.9;
        };
        summary = isSlow4G() ? strings.runtimeSlow4g : strings.runtimeCustom;
        break;
      }
      case 'simulate': {
        const {cpuSlowdownMultiplier, rttMs, throughputKbps} = throttling;
        // eslint-disable-next-line max-len
        cpuThrottling = `${i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (Simulated)`;
        networkThrottling = `${i18n.formatMilliseconds(rttMs)} TCP RTT, ` +
          `${i18n.formatKbps(throughputKbps)} throughput (Simulated)`;

        const isSlow4G = () => {
          return rttMs === 150 && throughputKbps === 1.6 * 1024;
        };
        summary = isSlow4G() ?
          strings.runtimeSlow4g : strings.runtimeCustom;
        break;
      }
      default:
        summary = cpuThrottling = networkThrottling = strings.runtimeUnknown;
    }

    // devtools-entry.js always sets `screenEmulation.disabled` when using mobile emulation,
    // because we handle the emulation outside of Lighthouse. Since the screen truly is emulated
    // as a mobile device, ignore `.disabled` in devtools and just check the form factor
    const isScreenEmulationDisabled = settings.channel === 'devtools' ?
      false :
      settings.screenEmulation.disabled;
    const isScreenEmulationMobile = settings.channel === 'devtools' ?
      settings.formFactor === 'mobile' :
      settings.screenEmulation.mobile;

    let deviceEmulation = strings.runtimeMobileEmulation;
    if (isScreenEmulationDisabled) {
      deviceEmulation = strings.runtimeNoEmulation;
    } else if (!isScreenEmulationMobile) {
      deviceEmulation = strings.runtimeDesktopEmulation;
    }

    const screenEmulation = isScreenEmulationDisabled ?
      undefined :
      // eslint-disable-next-line max-len
      `${settings.screenEmulation.width}x${settings.screenEmulation.height}, DPR ${settings.screenEmulation.deviceScaleFactor}`;

    return {
      deviceEmulation,
      screenEmulation,
      cpuThrottling,
      networkThrottling,
      summary,
    };
  }

  /**
   * Used to determine if the "passed" for the purposes of showing up in the "failed" or "passed"
   * sections of the report.
   *
   * @param {{score: (number|null), scoreDisplayMode: string}} audit
   * @return {boolean}
   */
  static showAsPassed(audit) {
    switch (audit.scoreDisplayMode) {
      case 'manual':
      case 'notApplicable':
        return true;
      case 'error':
      case 'informative':
        return false;
      case 'numeric':
      case 'binary':
      default:
        return Number(audit.score) >= RATINGS.PASS.minScore;
    }
  }

  /**
   * Convert a score to a rating label.
   * TODO: Return `'error'` for `score === null && !scoreDisplayMode`.
   *
   * @param {number|null} score
   * @param {string=} scoreDisplayMode
   * @return {string}
   */
  static calculateRating(score, scoreDisplayMode) {
    // Handle edge cases first, manual and not applicable receive 'pass', errored audits receive 'error'
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return RATINGS.PASS.label;
    } else if (scoreDisplayMode === 'error') {
      return RATINGS.ERROR.label;
    } else if (score === null) {
      return RATINGS.FAIL.label;
    }

    // At this point, we're rating a standard binary/numeric audit
    let rating = RATINGS.FAIL.label;
    if (score >= RATINGS.PASS.minScore) {
      rating = RATINGS.PASS.label;
    } else if (score >= RATINGS.AVERAGE.minScore) {
      rating = RATINGS.AVERAGE.label;
    }
    return rating;
  }

  /**
   * @param {LH.ReportResult.Category} category
   */
  static calculateCategoryFraction(category) {
    let numPassableAudits = 0;
    let numPassed = 0;
    let numInformative = 0;
    let totalWeight = 0;
    for (const auditRef of category.auditRefs) {
      const auditPassed = ReportUtils.showAsPassed(auditRef.result);

      // Don't count the audit if it's manual, N/A, or isn't displayed.
      if (auditRef.group === 'hidden' ||
          auditRef.result.scoreDisplayMode === 'manual' ||
          auditRef.result.scoreDisplayMode === 'notApplicable') {
        continue;
      } else if (auditRef.result.scoreDisplayMode === 'informative') {
        if (!auditPassed) {
          ++numInformative;
        }
        continue;
      }

      ++numPassableAudits;
      totalWeight += auditRef.weight;
      if (auditPassed) numPassed++;
    }
    return {numPassed, numPassableAudits, numInformative, totalWeight};
  }

  /**
   * @param {string} categoryId
   */
  static isPluginCategory(categoryId) {
    return categoryId.startsWith('lighthouse-plugin-');
  }

  /**
   * @param {LH.Result.GatherMode} gatherMode
   */
  static shouldDisplayAsFraction(gatherMode) {
    return gatherMode === 'timespan' || gatherMode === 'snapshot';
  }
}

export {ReportUtils};
