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
 * @property {*} [placeholders]
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

// @ts-ignore - @types/esprima lacks all of these
function computeDescription(ast, property, startRange) {
  const endRange = property.range[0];
  for (const comment of ast.comments || []) {
    if (comment.range[0] < startRange) continue;
    if (comment.range[0] > endRange) continue;
    if (comment.value.includes('@description')) {
      // This is a complex description with description and examples.
      // console.log(comment.value.replace(/\*/g, '').replace(/ {2}/g, '').trim().split('\n'));
      /** @type {string} */
      const vals = comment.value.replace(/\*/g, '').replace(/ {2}/g, '').trim();
      let parts = vals.match(/@.*(\n|$)/g);
      let description = '';
      let examples = {};
      // console.log(parts);
      // eslint-disable-next-line guard-for-in
      for (const i in parts) {
        let part = parts[i];
        if (part.startsWith('@description')) {
          description = part.replace('@description ', '').trim();
        }
        if (part.startsWith('@example ')) {
          // @ts-ignore
          let key = part.match(/\{\w{2,50}\}/).toString();
          key = key.substring(1, key.length - 1);
          let value = part.replace(/@example \{\w{2,50}\} /, '').trim();
          examples[key] = value;
        }
      }

      // if (!desc) {
      //   break;
      // }
      // console.log(desc)
      // const examples = Array.from(vals.match(/@example (.*) \n?/g));
      // console.log(desc, examples);
      return {description, examples};
    }
    return {description: comment.value.replace('*', '').trim()};
  }

  return {};
}

function convertMessageToPlaceholders(message, examples={}) {
  // Basically the same as markdown parsing in dom.js
  const placeholders = {};

  // replace code snippets
  let parts = message.split(/`(.*?)`/g); // Split on markdown code slashes
  let newMessage = '';
  let idx = 0;
  while (parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, codeText] = parts.splice(0, 2);
    newMessage += preambleText;
    if (codeText) {
      const pName = `MARKDOWN_SNIPPET_${idx++}`;
      newMessage += `$${pName}$`;
      placeholders[pName] = {
        content: `\`${codeText}\``,
        example: codeText,
      };
    }
  }

  // replace links
  // Split on markdown links (e.g. [some link](https://...)).
  parts = newMessage.split(/\[([^\]]*?)\]\((https?:\/\/.*?)\)/g);
  newMessage = '';
  idx = 0;

  while (parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, linkText, linkHref] = parts.splice(0, 3);
    newMessage += preambleText;

    // Append link if there are any.
    if (linkText && linkHref) {
      const ls = `LINK_START_${idx}`;
      const le = `LINK_END_${idx++}`;
      const repr = `$${ls}$${linkText}$${le}$`;
      newMessage += repr;
      placeholders[ls] = {
        content: '[',
      };
      placeholders[le] = {
        content: `](${linkHref})`,
      };
    }
  }

  // replace complex ICU numbers
  // milliseconds, seconds, bytes, extendedPercent, percent, etc.

  parts = newMessage.split(/\{(\w{2,50}), number, (milliseconds|seconds|bytes|percent|extendedPercent)\}/g);
  newMessage = '';
  idx = 0;

  while(parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, varName, icuType] = parts.splice(0, 3);
    newMessage += preambleText;

    // Append link if there are any.
    if (varName && icuType) {
      const iName = `COMPLEX_ICU_${idx++}`;
      newMessage += `$${iName}$`;
      let example = '0';

      // Make some good examples.
      switch (icuType) {
        case 'seconds':
          example = '2.4';
          break;
        case 'percent':
          example = '54.6%';
          break;
        case 'extendedPercent':
          example = '37.92%';
          break;
        default:
          // Random (but constant) number for examples.
          example = '499';
      }

      placeholders[iName] = {
        content: `{${varName}, number, ${icuType}}`,
        example: example,
      };
    }
  }

  // add examples for direct ICU replacement
  idx = 0;
  // eslint-disable-next-line guard-for-in
  for (const [key, value] of Object.entries(examples)) {
    console.log(key, value);

    if (!newMessage.includes(`{${key}}`)) continue;
    const eName = `ICU_${idx++}`;
    newMessage = newMessage.replace(`{${key}}`, `$${eName}$`);
    
    placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }


  // parts = newMessage.split(/\{(\w{2,50}), example, (.*?)\}/g);
  // newMessage = '';
  // idx = 0;
  // while (parts.length) {
  //   // Pop off the same number of elements as there are capture groups.
  //   const [preambleText, varName, exampleText] = parts.splice(0, 3);
  //   newMessage += preambleText;

  //   // Append link if there are any.
  //   if (varName && exampleText) {
  //     const eName = `ICU_${idx++}`;
  //     newMessage += `$${eName}$`;

  //     placeholders[eName] = {
  //       content: `{${varName}}`,
  //       example: exampleText,
  //     };
  //   }
  // }

  return {message: newMessage, placeholders};
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

            const res = computeDescription(ast, property, lastPropertyEndIndex);

            let description = res.description;
            let examples = res.examples;

            if (examples) {
              console.log(examples);
            }

            const converted = convertMessageToPlaceholders(val, examples);

            if (Object.entries(converted.placeholders).length === 0 && converted.placeholders.constructor === Object) {
              strings[`${relativePath} | ${key}`] = {message: converted.message, description};
            } else {
              strings[`${relativePath} | ${key}`] = {message: converted.message, description, placeholders: converted.placeholders};
            }
            lastPropertyEndIndex = property.range[1];
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
function createPsuedoLocaleStrings(strings) {
  /** @type {Record<string, ICUMessageDefn>} */
  const psuedoLocalizedStrings = {};
  for (const [key, defn] of Object.entries(strings)) {
    const message = defn.message;
    const psuedoLocalizedString = [];
    let braceCount = 0;
    let inPlaceholder = false;
    let useHatForAccentMark = true;
    for (const char of message) {
      psuedoLocalizedString.push(char);
      if (char === '$') {
        inPlaceholder = !inPlaceholder;
        continue;
      }
      if (inPlaceholder) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }

      // Hack to not change {plural{ICU}braces} nested an odd number of times.
      // ex: "{itemCount, plural, =1 {1 link found} other {# links found}}"
      // becomes "{itemCount, plural, =1 {1 l̂ín̂ḱ f̂óûńd̂} other {# ĺîńk̂ś f̂óûńd̂}}"
      // ex: "{itemCount, plural, =1 {1 link {nested_replacement} found} other {# links {nested_replacement} found}}"
      // becomes: "{itemCount, plural, =1 {1 l̂ín̂ḱ {nested_replacement} f̂óûńd̂} other {# ĺîńk̂ś {nested_replacement} f̂óûńd̂}}"
      if (braceCount % 2 === 1) continue;

      // Add diacritical marks to the preceding letter, alternating between a hat ( ̂ ) and an acute (´).
      if (/[a-z]/i.test(char)) {
        psuedoLocalizedString.push(useHatForAccentMark ? `\u0302` : `\u0301`);
        useHatForAccentMark = !useHatForAccentMark;
      }
    }

    psuedoLocalizedStrings[key] = {message: psuedoLocalizedString.join(''), placeholders: defn.placeholders};
  }

  return psuedoLocalizedStrings;
}

/**
 * @param {string} locale
 * @param {Record<string, ICUMessageDefn>} strings
 */
function writeStringsToLocaleFormat(locale, strings) {
  // function writeEnStringsToLocaleFormat(strings) {
  //   const fullPath = path.join(LH_ROOT, `lighthouse-core/lib/i18n/pre-locale/en-US.json`);

  const fullPath = path.join(LH_ROOT, `lighthouse-core/lib/i18n/${locale}.json`);
  /** @type {Record<string, ICUMessageDefn>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  fs.writeFileSync(fullPath, JSON.stringify(output, null, 2) + '\n');
}

const strings = collectAllStringsInDir(path.join(LH_ROOT, 'lighthouse-core'));
const psuedoLocalizedStrings = createPsuedoLocaleStrings(strings);
console.log('Collected from LH core!');

collectAllStringsInDir(path.join(LH_ROOT, 'stack-packs/packs'), strings);
console.log('Collected from Stack Packs!');

writeStringsToLocaleFormat('pre-locale/en-US', strings);
// Generate local pseudolocalized files for debugging while translating
writeStringsToLocaleFormat('pre-locale/en-XL', psuedoLocalizedStrings);
console.log('Written to disk!');
