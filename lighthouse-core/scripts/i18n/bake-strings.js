#!/usr/bin/env node
/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console, max-len */

const fs = require('fs');
const path = require('path');

/**
 * @typedef ICUMessageDefn
 * @property {string} message
 * @property {string} [description]
 * @property {Record<string, ICUPlaceholderDefn>} [placeholders]
 */

/**
 * @typedef ICUPlaceholderDefn
 * @property {string} content
 * @property {string} [example]
 */

const ignoredPathComponents = [
  '/.git',
  '/scripts',
  '/node_modules',
  '/test/',
  '-test.js',
  '-renderer.js',
];

/**
 * Take a series of CTC format ICU messages and converts them to LHL format by
 * replacing $placeholders$ with their {ICU} values. Functional opposite of
 * `convertMessageToPlaceholders`. This is commonly called as the last step in 
 * translation.
 *
 * Converts this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ($ICU_0$)",
 *    "placeholders": {
 *      "ICU_0": {
 *        "content": "{url}",
 *        "example": "https://example.com/"
 *      },
 *    },
 *  },
 * }
 *
 * Into this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Throws if there is a $placeholder$ in the message that has no corresponding
 * value in the placeholders object, or vice versa.
 *
 * @param {Record<string, ICUMessageDefn>} messages
 * @returns {Record<string, ICUMessageDefn>}
 */
function bakePlaceholders(messages) {
  for (const [_, defn] of Object.entries(messages)) {
    delete defn['description'];

    let message = defn['message'];
    const placeholders = defn['placeholders'];

    for (const placeholder in placeholders) {
      if (!Object.prototype.hasOwnProperty.call(placeholders, placeholder)) continue;

      const content = placeholders[placeholder]['content'];
      if (!message.includes(`$${placeholder}$`)) {
        throw Error(`Message "${message}" has extra placeholder "${placeholder}"`);
      }
      message = message.replace(`$${placeholder}$`, content);
    }

    // Sanity check that all placeholders are gone
    if (message.match(/\$\w+\$/)) throw Error(`Message "${message}" is missing placeholder`);

    defn['message'] = message;

    delete defn['placeholders'];
  }
  return messages;
}

/**
 * @param {*} file
 */
function collectPreLocaleStrings(file) {
  const rawdata = fs.readFileSync(file, 'utf8');
  const messages = JSON.parse(rawdata);
  return messages;
}

/**
 * @param {*} path
 * @param {*} output
 */
function saveLocaleStrings(path, output) {
  fs.writeFileSync(path, JSON.stringify(output, null, 2) + '\n');
}

/**
 * @param {string} dir
 * @param {string} output
 * @param {string} extension the file extension of the CTC files, '.ctc.json' is LH default, but '.json' when importing from Translators
 * @returns {Array<string>}
 */
function collectAndBakeCtcStrings(dir, output, extension = '.ctc.json') {
  const lhl = [];
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const relativePath = fullPath;// path.relative(LH_ROOT, fullPath);
    if (ignoredPathComponents.some(p => fullPath.includes(p))) continue;

    if (name.endsWith(extension)) {
      if (!process.env.CI) console.log('Correcting from', relativePath);
      const preLocaleStrings = collectPreLocaleStrings(relativePath);
      const strings = bakePlaceholders(preLocaleStrings);
      saveLocaleStrings(output + path.basename(name).replace('.ctc', ''), strings);
      lhl.push(path.basename(name));
    }
  }
  return lhl;
}

module.exports = {
  collectAndBakeCtcStrings,
  bakePlaceholders,
};
