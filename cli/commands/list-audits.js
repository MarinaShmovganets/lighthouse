/**
 * @license
 * Copyright 2016 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {getAuditList} from '../../core/index.js';

function listAudits() {
  const audits = getAuditList().map((i) => i.replace(/\.js$/, ''));
  process.stdout.write(JSON.stringify({audits}, null, 2));
  process.exit(0);
}

export {listAudits};
