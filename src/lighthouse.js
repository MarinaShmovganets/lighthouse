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

const Auditor = require('./auditor');
const Scheduler = require('./scheduler');
const Aggregator = require('./aggregator');

module.exports = function(driver, opts) {
  // Default mobile emulation and page loading to true.
  // The extension will switch these off initially.
  if (typeof opts.flags.mobile === 'undefined') {
    opts.flags.mobile = true;
  }

  if (typeof opts.flags.loadPage === 'undefined') {
    opts.flags.loadPage = true;
  }

  const config = opts.config;
  if (!config) {
    throw new Error('Config is not defined; did you override the default config correctly?');
  }

  const passes = config.passes.map(pass => {
    pass.gatherers = pass.gatherers.map(gatherer => {
      try {
        const GathererClass = require(`./gatherers/${gatherer}`);
        return new GathererClass();
      } catch (requireError) {
        throw new Error(`Unable to locate gatherer: ${gatherer}`);
      }
    });

    return pass;
  });

  const audits = config.audits.map(audit => {
    try {
      return require(`./audits/${audit}`);
    } catch (requireError) {
      throw new Error(`Unable to locate audit: ${audit}`);
    }
  });

  // The runs of Lighthouse should be tested in integration / smoke tests, so testing for coverage
  // here, at least from a unit test POV, is relatively low merit.
  /* istanbul ignore next */
  return Scheduler
      .run(passes, Object.assign({}, opts, {driver}))
      .then(artifacts => Auditor.audit(artifacts, audits))
      .then(results => Aggregator.aggregate(config.aggregations, results))
      .then(aggregations => {
        return {
          url: opts.url,
          aggregations
        };
      });
};

/**
 * Returns list of audit names for external querying.
 * @return {!Array<string>}
 */
module.exports.getAuditList = function() {
  // FIXME: Should glob the require path for actual audits.
  return []; //AUDITS.map(audit => audit.meta.name);
};
