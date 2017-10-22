/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const IsCrawlableAudit = require('../../../audits/seo/is-crawlable.js');
const assert = require('assert');

/* eslint-env mocha */

describe('SEO: Is page crawlable audit', () => {
  it('fails when page is blocked from indexing with a robots metatag', () => {
    const robotsValues = [
      'noindex',
      'none',
      'foo, noindex, bar',
      'all, none, all',
      '     noindex      ',
    ];

    const allRuns = robotsValues.map(robotsValue => {
      const mainResource = {
        responseHeaders: [],
      };
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
        requestMainResource: () => Promise.resolve(mainResource),
        MetaRobots: robotsValue,
      };

      return IsCrawlableAudit.audit(artifacts).then(auditResult => {
        assert.equal(auditResult.rawValue, false);
        assert.equal(auditResult.details.items.length, 1);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when there are no blocking directives in the metatag', () => {
    const mainResource = {
      responseHeaders: [],
    };
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      MetaRobots: 'all, noarchive',
    };

    return IsCrawlableAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('succeeds when there is no robots metatag', () => {
    const mainResource = {
      responseHeaders: [],
    };
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      MetaRobots: null,
    };

    return IsCrawlableAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('fails when page is blocked from indexing with a header', () => {
    const robotsHeaders = [
      [
        {name: 'x-robots-tag', value: 'noindex'},
      ],
      [
        {name: 'X-Robots-Tag', value: 'all'},
        {name: 'x-robots-tag', value: 'none'},
      ],
      [
        {name: 'X-ROBOTS-TAG', value: 'all, none'},
      ],
      [
        {name: 'x-robots-tag', value: '    noindex    '},
      ],
    ];

    const allRuns = robotsHeaders.map(headers => {
      const mainResource = {
        responseHeaders: headers,
      };
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
        requestMainResource: () => Promise.resolve(mainResource),
        MetaRobots: null,
      };

      return IsCrawlableAudit.audit(artifacts).then(auditResult => {
        assert.equal(auditResult.rawValue, false);
        assert.equal(auditResult.details.items.length, 1);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when there are no blocking directives in the robots header', () => {
    const mainResource = {
      responseHeaders: [
        {name: 'X-Robots-Tag', value: 'all, nofollow'},
      ],
    };
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      MetaRobots: null,
    };

    return IsCrawlableAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });

  it('succeeds when there is no robots header', () => {
    const mainResource = {
      responseHeaders: [],
    };
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      MetaRobots: null,
    };

    return IsCrawlableAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });
});
