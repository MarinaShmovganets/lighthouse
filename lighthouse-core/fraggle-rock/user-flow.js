/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {generateFlowReportHtml} = require('../../report/generator/report-generator.js');
const {navigation, startTimespan, snapshot} = require('./api.js');

/** @typedef {Parameters<snapshot>[0]} FrOptions */
/** @typedef {Omit<FrOptions, 'page'>} UserFlowOptions */
/** @typedef {UserFlowOptions & {stepName?: string}} StepOptions */
/** @typedef {Omit<LH.FlowResult.Step, 'name'> & {name?: string}} Step */

class UserFlow {
  /**
   * @param {FrOptions['page']} page
   * @param {UserFlowOptions=} options
   */
  constructor(page, options) {
    /** @type {FrOptions} */
    this.options = {page, ...options};
    /** @type {Step[]} */
    this.steps = [];
  }

  /**
   * @param {string} longUrl
   * @returns {string}
   */
  _shortenUrl(longUrl) {
    const url = new URL(longUrl);
    return `${url.hostname}${url.pathname}`;
  }

  /**
   * The step label should be enumerated if there is another report of the same gather mode in the same section.
   * Navigation reports will never be enumerated.
   *
   * @param {number} index
   * @return {boolean}
   */
  _shouldEnumerate(index) {
    const {steps} = this;
    if (steps[index].lhr.gatherMode === 'navigation') return false;

    for (let i = index + 1; steps[i] && steps[i].lhr.gatherMode !== 'navigation'; ++i) {
      if (steps[i].name) continue;
      if (steps[i].lhr.gatherMode === steps[index].lhr.gatherMode) {
        return true;
      }
    }
    for (let i = index - 1; steps[i] && steps[i].lhr.gatherMode !== 'navigation'; --i) {
      if (steps[i].name) continue;
      if (steps[i].lhr.gatherMode === steps[index].lhr.gatherMode) {
        return true;
      }
    }
    return false;
  }

  /**
   * @return {string[]}
   */
  _getDerivedStepNames() {
    let numTimespan = 1;
    let numSnapshot = 1;

    return this.steps.map((step, i) => {
      const {lhr} = step;
      const shortUrl = this._shortenUrl(lhr.finalUrl);

      switch (lhr.gatherMode) {
        case 'navigation':
          numTimespan = 1;
          numSnapshot = 1;
          return `Navigation report (${shortUrl})`;
        case 'timespan':
          if (this._shouldEnumerate(i)) {
            return `Timespan report ${numTimespan++} (${shortUrl})`;
          }
          return `Timespan report (${shortUrl})`;
        case 'snapshot':
          if (this._shouldEnumerate(i)) {
            return `Snapshot report ${numSnapshot++} (${shortUrl})`;
          }
          return `Snapshot report (${shortUrl})`;
      }
    });
  }

  /**
   * @param {string} url
   * @param {StepOptions=} stepOptions
   */
  async navigate(url, stepOptions) {
    if (this.currentTimespan) throw Error('Timespan already in progress');
    const options = {url, ...this.options, ...stepOptions};
    const result = await navigation(options);
    if (!result) throw Error('Navigation returned undefined');
    this.steps.push({
      lhr: result.lhr,
      name: stepOptions && stepOptions.stepName,
    });
    return result;
  }

  /**
   * @param {StepOptions=} stepOptions
   */
  async startTimespan(stepOptions) {
    if (this.currentTimespan) throw Error('Timespan already in progress');
    const options = {...this.options, ...stepOptions};
    const timespan = await startTimespan(options);
    this.currentTimespan = {timespan, options};
  }

  async endTimespan() {
    if (!this.currentTimespan) throw Error('No timespan in progress');
    const {timespan, options} = this.currentTimespan;
    const result = await timespan.endTimespan();
    this.currentTimespan = undefined;
    if (!result) throw Error('Timespan returned undefined');
    this.steps.push({
      lhr: result.lhr,
      name: options && options.stepName,
    });
    return result;
  }

  /**
   * @param {StepOptions=} stepOptions
   */
  async snapshot(stepOptions) {
    if (this.currentTimespan) throw Error('Timespan already in progress');
    const options = {...this.options, ...stepOptions};
    const result = await snapshot(options);
    if (!result) throw Error('Snapshot returned undefined');
    this.steps.push({
      lhr: result.lhr,
      name: stepOptions && stepOptions.stepName,
    });
    return result;
  }

  /**
   * @return {LH.FlowResult}
   */
  getFlowResult() {
    const defaultNames = this._getDerivedStepNames();
    const steps = this.steps.map((step, i) => {
      const name = step.name || defaultNames[i];
      return {...step, name};
    });
    return {steps};
  }

  /**
   * @return {string}
   */
  generateReport() {
    const flowResult = this.getFlowResult();
    return generateFlowReportHtml(flowResult);
  }
}

module.exports = UserFlow;
