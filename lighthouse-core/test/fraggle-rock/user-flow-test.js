/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const UserFlow = require('../../fraggle-rock/user-flow.js');

describe('_getDerivedStepNames', () => {
  it('uses provided step name if available', () => {
    const steps = /** @type {any} */ ([
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'timespan', finalUrl: 'https://example.com'}, name: 'Search input'},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}, name: 'Search results'},
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com/page'}},
    ]);

    // @ts-expect-error page will not be use, we are only testing _getDerivedStepNames
    const flow = new UserFlow();
    flow.steps = steps;

    const stepNames = flow._getDerivedStepNames();

    expect(stepNames).toEqual([
      'Navigation report (example.com/)',
      'Search input',
      'Search results',
      'Navigation report (example.com/page)',
    ]);
  });

  it('enumerates if multiple in same group with no name', () => {
    const steps = /** @type {any} */ ([
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'timespan', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
    ]);

    // @ts-expect-error page will not be use, we are only testing _getDerivedStepNames
    const flow = new UserFlow();
    flow.steps = steps;

    const stepNames = flow._getDerivedStepNames();

    expect(stepNames).toEqual([
      'Navigation report (example.com/)',
      'Timespan report (example.com/)',
      'Snapshot report 1 (example.com/)',
      'Snapshot report 2 (example.com/)',
    ]);
  });

  it('resets count in new group', () => {
    const steps = /** @type {any} */ ([
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'timespan', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com/page'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com/page'}},
    ]);

    // @ts-expect-error page will not be use, we are only testing _getDerivedStepNames
    const flow = new UserFlow();
    flow.steps = steps;

    const stepNames = flow._getDerivedStepNames();

    expect(stepNames).toEqual([
      'Navigation report (example.com/)',
      'Timespan report (example.com/)',
      'Snapshot report 1 (example.com/)',
      'Snapshot report 2 (example.com/)',
      'Navigation report (example.com/page)',
      'Snapshot report (example.com/page)',
    ]);
  });

  it('does not increment if name is provided', () => {
    const steps = /** @type {any} */ ([
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'timespan', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}, name: 'Search results'},
      {lhr: {gatherMode: 'snapshot', finalUrl: 'https://example.com'}},
    ]);

    // @ts-expect-error page will not be use, we are only testing _getDerivedStepNames
    const flow = new UserFlow();
    flow.steps = steps;

    const stepNames = flow._getDerivedStepNames();

    expect(stepNames).toEqual([
      'Navigation report (example.com/)',
      'Timespan report (example.com/)',
      'Snapshot report 1 (example.com/)',
      'Search results',
      'Snapshot report 2 (example.com/)',
    ]);
  });

  it('does not enumerate navigations', () => {
    const steps = /** @type {any} */ ([
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com'}},
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com/page'}},
      {lhr: {gatherMode: 'navigation', finalUrl: 'https://example.com/page2'}},
    ]);

    // @ts-expect-error page will not be use, we are only testing _getDerivedStepNames
    const flow = new UserFlow();
    flow.steps = steps;

    const stepNames = flow._getDerivedStepNames();

    expect(stepNames).toEqual([
      'Navigation report (example.com/)',
      'Navigation report (example.com/page)',
      'Navigation report (example.com/page2)',
    ]);
  });
});
