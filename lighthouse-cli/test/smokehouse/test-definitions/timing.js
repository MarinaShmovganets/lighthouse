/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @type {LH.Config.Json} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['viewport'],
  },
};

const gatherTimings = [
  {
    'name': 'lh:init:config',
  },
  {
    'name': 'lh:config:requireGatherers',
  },
  {
    'name': 'lh:config:requireAudits',
  },
  {
    'name': 'lh:runner:gather',
  },
  {
    'name': 'lh:init:connect',
  },
  {
    'name': 'lh:gather:loadBlank',
  },
  {
    'name': 'lh:driver:navigate',
  },
  {
    'name': 'lh:gather:getVersion',
  },
  {
    'name': 'lh:gather:getBenchmarkIndex',
  },
  {
    'name': 'lh:gather:setupDriver',
  },
  {
    'name': 'lh:prepare:navigationMode',
  },
  {
    'name': 'lh:gather:runPass-defaultPass',
  },
  {
    'name': 'lh:gather:loadBlank',
  },
  {
    'name': 'lh:driver:navigate',
  },
  {
    'name': 'lh:prepare:navigation',
  },
  {
    'name': 'lh:storage:clearDataForOrigin',
  },
  {
    'name': 'lh:storage:clearBrowserCaches',
  },
  {
    'name': 'lh:gather:prepareThrottlingAndNetwork',
  },
  {
    'name': 'lh:gather:beforePass',
  },
  {
    'name': 'lh:gather:beforePass:MetaElements',
  },
  {
    'name': 'lh:gather:beginRecording',
  },
  {
    'name': 'lh:gather:loadPage-defaultPass',
  },
  {
    'name': 'lh:driver:navigate',
  },
  {
    'name': 'lh:gather:pass',
  },
  {
    'name': 'lh:gather:getDevtoolsLog',
  },
  {
    'name': 'lh:computed:NetworkRecords',
  },
  {
    'name': 'lh:gather:afterPass',
  },
  {
    'name': 'lh:gather:afterPass:MetaElements',
  },
  {
    'name': 'lh:gather:populateBaseArtifacts',
  },
  {
    'name': 'lh:gather:collectStacks',
  },
  {
    'name': 'lh:gather:disconnect',
  },
  {
    'name': 'lh:storage:clearDataForOrigin',
  },
];

const auditTimings = [
  {
    'name': 'lh:assetSaver:saveArtifacts',
  },
  {
    'name': 'lh:runner:audit',
  },
  {
    'name': 'lh:runner:auditing',
  },
  {
    'name': 'lh:audit:viewport',
  },
  {
    'name': 'lh:computed:ViewportMeta',
  },
  {
    'name': 'lh:runner:generate',
  },
];

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    Timing: gatherTimings,
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/simple-page.html',
    finalUrl: 'http://localhost:10200/simple-page.html',
    audits: {},
    timing: {
      entries: [
        ...gatherTimings,
        ...auditTimings,
      ],
    },
  },
};

export default {
  id: 'timing',
  expectations,
  config,
};
