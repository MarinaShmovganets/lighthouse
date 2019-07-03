#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console, max-len */

const fs = require('fs');
const path = require('path');

const LH_ROOT = path.join(__dirname, '../../../');

/**
 * @typedef ICUMessageDefn
 * @property {string} message
 * @property {string} [description]
 */

const ignoredPathComponents = [
  '/.git',
  '/scripts',
  '/node_modules',
  '/test/',
  '-test.js',
  '-renderer.js',
];

function collectPreLocaleStrings(file) {
  const rawdata = fs.readFileSync(file, 'utf8');
  const messages = JSON.parse(rawdata);
  return messages;
}

function bakePlaceholders(messages) {
  for (const key in messages) {
    if (!Object.prototype.hasOwnProperty.call(messages, key)) continue;

    delete messages[key]['description'];

    let message = messages[key]['message'];
    const placeholders = messages[key]['placeholders'];

    for (const placeholder in placeholders) {
      if (!Object.prototype.hasOwnProperty.call(placeholders, placeholder)) continue;

      const content = placeholders[placeholder]['content'];
      const re = new RegExp('\\$' + placeholder + '\\$');
      message = message.replace(re, content);
    }
    messages[key]['message'] = message;

    delete messages[key]['placeholders'];
  }
  return messages;
}

function saveLocaleStrings(path, output) {
  fs.writeFileSync(path, JSON.stringify(output, null, 2) + '\n');
}

/**
 * @param {string} dir
 * @param {Map<string, Record<string, ICUMessageDefn>>} strings
 */
function collectAllPreLocaleStrings(dir, strings = new Map()) {
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const relativePath = path.relative(LH_ROOT, fullPath);
    if (ignoredPathComponents.some(p => fullPath.includes(p))) continue;

    if (name.endsWith('.json')) {
      if (!process.env.CI) console.log('Correcting from', relativePath);
      const preLocaleStrings = collectPreLocaleStrings(relativePath);
      const strings = bakePlaceholders(preLocaleStrings);
      saveLocaleStrings(path.join(LH_ROOT, `lighthouse-core/lib/i18n/locales/${path.basename(name)}`), strings);
    }
  }

  return strings;
}

collectAllPreLocaleStrings(path.join(LH_ROOT, 'lighthouse-core/lib/i18n/pre-locale/'));
