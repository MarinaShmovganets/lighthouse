/**
 * @license
 * Copyright 2019 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config.Plugin} */
module.exports = {
  audits: [
    {path: 'uses-rel-preload'},
  ],
  category: {
    title: 'NoGroups',
    auditRefs: [
      {id: 'uses-rel-preload', weight: 1},
    ],
  },
};
