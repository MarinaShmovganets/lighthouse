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
const esprima = require('esprima');

const LH_ROOT = path.join(__dirname, '../../../');
const UISTRINGS_REGEX = /UIStrings = (.|\s)*?\};\n/im;

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

// @ts-ignore - @types/esprima lacks all of these
function computeDescription(ast, property, startRange) {
  const endRange = property.range[0];
  for (const comment of ast.comments || []) {
    if (comment.range[0] < startRange) continue;
    if (comment.range[0] > endRange) continue;
    return comment.value.replace('*', '').trim();
  }

  return '';
}

/**
 * @param {string} dir
 * @param {Record<string, ICUMessageDefn>} strings
 */
function collectAllStringsInDir(dir, strings = {}) {
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const relativePath = path.relative(LH_ROOT, fullPath);
    if (ignoredPathComponents.some(p => fullPath.includes(p))) continue;

    if (fs.statSync(fullPath).isDirectory()) {
      collectAllStringsInDir(fullPath, strings);
    } else {
      if (name.endsWith('.js')) {
        if (!process.env.CI) console.log('Collecting from', relativePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const exportVars = require(fullPath);
        const regexMatches = !!UISTRINGS_REGEX.test(content);
        const exportsUIStrings = !!exportVars.UIStrings;
        if (!regexMatches && !exportsUIStrings) continue;

        if (regexMatches && !exportsUIStrings) {
          throw new Error('UIStrings defined but not exported');
        }

        if (exportsUIStrings && !regexMatches) {
          throw new Error('UIStrings exported but no definition found');
        }

        // @ts-ignore regex just matched
        const justUIStrings = 'const ' + content.match(UISTRINGS_REGEX)[0];
        // just parse the UIStrings substring to avoid ES version issues, save time, etc
        // @ts-ignore - esprima's type definition is supremely lacking
        const ast = esprima.parse(justUIStrings, {comment: true, range: true});

        for (const stmt of ast.body) {
          if (stmt.type !== 'VariableDeclaration') continue;
          if (stmt.declarations[0].id.name !== 'UIStrings') continue;

          let lastPropertyEndIndex = 0;
          for (const property of stmt.declarations[0].init.properties) {
            const key = property.key.name;
            const val = exportVars.UIStrings[key];
            if (typeof val === 'string') {
              const description = computeDescription(ast, property, lastPropertyEndIndex);
              strings[`${relativePath} | ${key}`] = {message: val, description};
              lastPropertyEndIndex = property.range[1];
            } else {
              // console.log(property.value.properties[0].range[1]);
              // console.log(property.value.properties[1].value.properties);
              let message = val.message;
              // const prevProp = property.value.properties[1].value.properties[1];
              // const thisProp = property.value.properties[1].value.properties[2];
              
              const description = computeDescription(ast, property, lastPropertyEndIndex);
              /**
               *  Transform: 
               *  placeholders: {
               *    /** example val *\/
               *    key: value,
               *    ...
               *  },
               *  Into:
               *  placeholders: {
               *    key: {
               *      content: value,
               *      example: example val,
               *    },
               *    ...
               *  }
               */
              // init last prop to the 'messages' end range
              let lastPropEndIndex = property.value.properties[0].range[1];
              let idx = 0;
              const placeholdersMini = val.placeholders;
              const placeholders = {};
              Object.entries(placeholdersMini).forEach(entry => {
                const key = entry[0];
                const value = entry[1];
                const thisProp = property.value.properties[1].value.properties[idx];
                const thisDesc = computeDescription(ast, thisProp, lastPropEndIndex);
                placeholders[key] = {
                  content: value,
                };
                if (thisDesc) {
                  placeholders[key].example = thisDesc;
                }

                // replace {.*} with $.*$
                message = message.replace(`{${key}}`, `\$${key}\$`);
                idx++;
                lastPropEndIndex = thisProp.range[1];
              });
              strings[`${relativePath} | ${key}`] = {message, description, placeholders};
              lastPropertyEndIndex = property.range[1];
            }
          }
        }
      }
    }
  }

  return strings;
}

/**
 * @param {Record<string, ICUMessageDefn>} strings
 */
function writeEnStringsToLocaleFormat(strings) {
  const fullPath = path.join(LH_ROOT, `lighthouse-core/lib/i18n/pre-locale/en-US.json`);
  /** @type {Record<string, ICUMessageDefn>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  fs.writeFileSync(fullPath, JSON.stringify(output, null, 2) + '\n');
}

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
