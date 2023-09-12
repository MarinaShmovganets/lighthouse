/**
 * @license
 * Copyright 2021 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import {getModuleDirectory} from './esm-utils.js';

const LH_ROOT = path.dirname(getModuleDirectory(import.meta));
const pkg = JSON.parse(fs.readFileSync(`${LH_ROOT}/package.json`, 'utf-8'));
const lighthouseVersion = pkg.version;

export {
  LH_ROOT,
  lighthouseVersion,
};
