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
const bakery = require('./bake-strings.js');

const LH_ROOT = path.join(__dirname, '../../../');
const UISTRINGS_REGEX = /UIStrings = (.|\s)*?\};\n/im;

/**
 * @typedef ICUMessageDefn
 * @property {string} message
 * @property {string} [description]
 * @property {string} [meaning]
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


// @ts-ignore - @types/esprima lacks all of these
function computeDescription(ast, property, value, startRange) {
  const endRange = property.range[0];
  const findIcu = /\{(\w+)\}/g;
  for (const comment of ast.comments || []) {
    if (comment.range[0] < startRange) continue;
    if (comment.range[0] > endRange) continue;
    if (comment.value.includes('@')) {
      // This is a complex description with description and examples.
      let description = '';
      /** @type {Record<string, string>} */
      const examples = {};

      const r = /@(\w+) ({\w+})?(.*)(\n|$)/g;
      let matches;
      while ((matches = r.exec(comment.value)) !== null) {
        const tagName = matches[1];
        const placeholder = matches[2];
        const message = matches[3].trim();

        if (tagName === 'description') {
          description = message;
        } else if (tagName === 'example') {
          // Make sure the ICU var exists in string
          if (!value.includes(placeholder)) {
            throw Error(`Example missing ICU replacement in message "${message}"`);
          }
          examples[placeholder.substring(1, placeholder.length - 1)] = message;
        }
      }
      // Make sure all ICU vars have examples
      while ((matches = findIcu.exec(value)) !== null) {
        const varName = matches[1];
        if (!examples[varName]) {
          throw Error(`Variable '${varName}' is missing example comment in message "${value}"`);
        }
      }

      // Make sure description is not empty
      if (description.length === 0) throw Error(`Empty @description for message "${value}"`);
      return {description, examples};
    }

    const description = comment.value.replace('*', '').trim();

    // Make sure all ICU vars have examples
    if (value.match(findIcu)) {
      throw Error(`Variable '${value.match(/.*\{(\w+)\}.*/)[1]}' ` +
        `is missing example comment in message "${value}"`);
    }

    // Make sure description is not empty
    if (description.length === 0) throw Error(`Empty description for message "${value}"`);

    // The entire comment is the description, so return everything.
    return {description};
  }
  throw Error(`No Description for message "${value}"`);
}

/**
 * Take a series of LHL format ICU messages and converts them
 * to CTC format by replacing {ICU} and `markdown` with
 * $placeholders$. Functional opposite of `bakePlaceholders`. This is commonly
 * called as one of the first steps in translation, via collect-strings.js.
 *
 * Converts this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Into this:
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
 * Throws if the message violates some basic sanity checking.
 *
 * @param {string} message
 * @param {Record<string, string>} examples
 * @returns {ICUMessageDefn}
 */
function convertMessageToPlaceholders(message, examples = {}) {
  // Basically the same as markdown parsing in dom.js
  const icu = {
    message,
    placeholders: {},
  };

  // Process each placeholder type
  _processPlaceholderMarkdownCode(icu);

  _processPlaceholderMarkdownLink(icu);

  _processPlaceholderComplexIcu(icu);

  _processPlaceholderDirectIcu(icu, examples);

  return icu;
}

/**
 * Convert markdown code blocks into placeholders with examples.
 *
 * @param {ICUMessageDefn} icu
 */
function _processPlaceholderMarkdownCode(icu) {
  // Check that number of backticks is even.
  if ((icu.message.split('`').length - 1) % 2 !== 0) {
    throw Error(`Open backtick in message "${icu.message}"`);
  }

  // Split on markdown code slashes
  const parts = icu.message.split(/`(.*?)`/g);
  icu.message = '';
  let idx = 0;
  while (parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, codeText] = parts.splice(0, 2);
    icu.message += preambleText;
    if (codeText) {
      const pName = `MARKDOWN_SNIPPET_${idx++}`;
      // Backtick replacement looks unreadable here, so .join() instead.
      icu.message += ['$', pName, '$'].join('');
      icu.placeholders[pName] = {
        content: ['`', codeText, '`'].join(''),
        example: codeText,
      };
    }
  }
}

/**
 * Convert markdown html links into placeholders.
 *
 * @param {ICUMessageDefn} icu
 */
function _processPlaceholderMarkdownLink(icu) {
  // Check that link markdown is not slightly off.
  if (icu.message.match(/\[.*\] \(.*\)/)) {
    throw Error(`Bad Link syntax in message "${icu.message}"`);
  }

  // Split on markdown links (e.g. [some link](https://...)).
  const parts = icu.message.split(/\[([^\]]*?)\]\((https?:\/\/.*?)\)/g);
  icu.message = '';
  let idx = 0;

  while (parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, linkText, linkHref] = parts.splice(0, 3);
    icu.message += preambleText;

    // Append link if there are any.
    if (linkText && linkHref) {
      const ls = `LINK_START_${idx}`;
      const le = `LINK_END_${idx++}`;
      const repr = `$${ls}$${linkText}$${le}$`;
      icu.message += repr;
      icu.placeholders[ls] = {
        content: '[',
      };
      icu.placeholders[le] = {
        content: `](${linkHref})`,
      };
    }
  }
}

/**
 * Convert complex ICU syntax into placeholders with examples.
 *
 * @param {ICUMessageDefn} icu
 */
function _processPlaceholderComplexIcu(icu) {
  // Check that complex ICU not using non-supported format
  if (icu.message.match(
    /\{(\w{2,50}), number, (?!milliseconds|seconds|bytes|percent|extendedPercent).*\}/)) {
    throw Error(`Unsupported ICU format in message "${icu.message}"`);
  }

  // Split on complex ICU: {var, number, type}
  const parts = icu.message.split(
    /\{(\w{2,50}), number, (milliseconds|seconds|bytes|percent|extendedPercent)\}/g);
  icu.message = '';
  let idx = 0;

  while (parts.length) {
    // Pop off the same number of elements as there are capture groups.
    const [preambleText, varName, icuType] = parts.splice(0, 3);
    icu.message += preambleText;

    // Append link if there are any.
    if (varName && icuType) {
      const iName = `COMPLEX_ICU_${idx++}`;
      icu.message += `$${iName}$`;
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

      icu.placeholders[iName] = {
        content: `{${varName}, number, ${icuType}}`,
        example: example,
      };
    }
  }
}

/**
 * Add examples for direct ICU replacement.
 *
 * @param {ICUMessageDefn} icu
 * @param {Record<string, string>} examples
 */
function _processPlaceholderDirectIcu(icu, examples) {
  let tempMessage = icu.message;
  let idx = 0;
  for (const [key, value] of Object.entries(examples)) {
    if (!icu.message.includes(`{${key}}`)) continue;
    const eName = `ICU_${idx++}`;
    tempMessage = tempMessage.replace(`{${key}}`, `$${eName}$`);

    icu.placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }
  icu.message = tempMessage;
}

/**
 * Take a series of messages and apply ĥât̂ markers to the translatable portions
 * of the text.  Used to generate `en-XL` locale to debug i18n strings.
 *
 * @param {Record<string, ICUMessageDefn>} messages
 */
function createPsuedoLocaleStrings(messages) {
  /** @type {Record<string, ICUMessageDefn>} */
  const psuedoLocalizedStrings = {};
  for (const [key, defn] of Object.entries(messages)) {
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
    psuedoLocalizedStrings[key] = {
      message: psuedoLocalizedString.join(''),
      placeholders: defn.placeholders,
    };
  }
  return psuedoLocalizedStrings;
}

/** @type {Map<string, string>} */
const seenStrings = new Map();

/** @type {number} */
let collisions = 0;

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
            const {description, examples} = computeDescription(ast, property, val, lastPropertyEndIndex);

            const converted = convertMessageToPlaceholders(val, examples);

            const messageKey = `${relativePath} | ${key}`;

            /** @type {ICUMessageDefn} */
            const msg = {
              message: converted.message,
              description,
            };

            if (Object.entries(converted.placeholders).length > 0 &&
              converted.placeholders.constructor === Object) {
              msg.placeholders = converted.placeholders;
            }

            // check for duplicates, if duplicate, add @description as @meaning to both
            if (seenStrings.has(msg.message)) {
              msg.meaning = msg.description;
              const id = seenStrings.get(msg.message);
              // Shouldn't be able to get here, but ts wants a check.
              if (!id) throw new Error('Message has collision, but collision not recorded in seen.');
              if (!strings[id].meaning) {
                strings[id].meaning = strings[id].description;
                collisions++;
              }
              collisions++;
            }

            seenStrings.set(msg.message, messageKey);


            strings[messageKey] = msg;

            lastPropertyEndIndex = property.range[1];
          }
        }
      }
    }
  }

  return strings;
}

/**
 * @param {string} locale
 * @param {Record<string, ICUMessageDefn>} strings
 */
function writeStringsToCtcFiles(locale, strings) {
  const fullPath = path.join(LH_ROOT, `lighthouse-core/lib/i18n/locales/${locale}.ctc.json`);
  /** @type {Record<string, ICUMessageDefn>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  fs.writeFileSync(fullPath, JSON.stringify(output, null, 2) + '\n');
}

// @ts-ignore Test if called from the CLI or as a module.
if (require.main === module) {
  const strings = collectAllStringsInDir(path.join(LH_ROOT, 'lighthouse-core'));
  console.log('Collected from LH core!');

  collectAllStringsInDir(path.join(LH_ROOT, 'stack-packs/packs'), strings);
  console.log('Collected from Stack Packs!');

  if ((collisions) > 0) {
    console.log(`MEANING COLLISION: ${collisions} string(s) have the same content.`);
  }

  writeStringsToCtcFiles('en-US', strings);
  console.log('Written to disk!', 'en-US.ctc.json');
  // Generate local pseudolocalized files for debugging while translating
  writeStringsToCtcFiles('en-XL', createPsuedoLocaleStrings(strings));
  console.log('Written to disk!', 'en-XL.ctc.json');

  // Bake the ctc en-US and en-XL files into en-US and en-XL LHL format
  const lhl = bakery.collectAndBakeCtcStrings(path.join(LH_ROOT, 'lighthouse-core/lib/i18n/locales/'),
  path.join(LH_ROOT, 'lighthouse-core/lib/i18n/locales/'));
  lhl.forEach(function(locale) {
    console.log(`Baked ${locale} into LHL format.`);
  });
}

module.exports = {
  computeDescription,
  createPsuedoLocaleStrings,
  convertMessageToPlaceholders,
};
