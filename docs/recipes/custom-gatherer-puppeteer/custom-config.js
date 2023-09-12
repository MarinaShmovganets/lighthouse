/**
 * @license
 * Copyright 2020 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export default {
  artifacts: [
    {id: 'CustomGatherer', gatherer: 'custom-gatherer'},
  ],

  audits: [
    'custom-audit',
  ],

  categories: {
    mysite: {
      title: 'My custom audit',
      description: 'Super awesome, strings included',
      auditRefs: [
        {id: 'custom-audit', weight: 1},
      ],
    },
  },
};
