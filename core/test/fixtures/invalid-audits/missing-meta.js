/**
 * @license
 * Copyright 2016 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../../../audits/audit.js';

class MissingMeta extends Audit {
  static audit(_) {
    return {
      score: 1,
    };
  }
}

export default MissingMeta;
