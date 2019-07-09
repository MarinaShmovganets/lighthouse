#!/usr/bin/env node
/**
* @license Copyright 2019 Google Inc. All Rights Reserved.
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
* Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/
'use strict';

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
      let resArr;
      while ((resArr = r.exec(comment.value)) !== null) {
        const tagName = resArr[1];
        const placeholder = resArr[2];
        const message = resArr[3].trim();

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
      while ((resArr = findIcu.exec(value)) !== null) {
        const varName = resArr[1];
        if (!examples[varName]) {
          throw Error(`Variable '${varName}' is missing example comment in message "${value}"`);
        }
      }
      return {description, examples};
    }
    // Make sure all ICU vars have examples
    if (value.match(findIcu)) {
      throw Error(`Variable '${value.match(/.*\{(\w+)\}.*/)[1]}' ` +
        `is missing example comment in message "${value}"`);
    }

    // The entire comment is the description, so return everything.
    return {description: comment.value.replace('*', '').trim()};
  }
  return {};
}

/**
 * Take a series of lighthouse-i18n-json format ICU messages and converts them
 * to messages.json format by replacing {ICU} and `markdown` with
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
  /** @type {Record<string, ICUPlaceholderDefn>} */
  const placeholders = {};

  // Sanity checks
  // Number of backticks is even.
  if ((message.split('`').length - 1) % 2 !== 0) {
    throw Error(`Open backtick in message "${message}"`);
  }
  // Link markdown is not slightly off.
  if (message.match(/\[.*\] \(.*\)/)) {
    throw Error(`Bad Link syntax in message "${message}"`);
  }
  // Complex ICU using non-supported format
  if (message.match(
    /\{(\w{2,50}), number, (?!milliseconds|seconds|bytes|percent|extendedPercent).*\}/)) {
    throw Error(`Unsupported ICU format in message "${message}"`);
  }

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
      // Backtick replacement looks unreadable here, so .join() instead.
      newMessage += ['$', pName, '$'].join('');
      placeholders[pName] = {
        content: ['`', codeText, '`'].join(''),
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
  parts = newMessage.split(
    /\{(\w{2,50}), number, (milliseconds|seconds|bytes|percent|extendedPercent)\}/g);
  newMessage = '';
  idx = 0;

  while (parts.length) {
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
  for (const [key, value] of Object.entries(examples)) {
    if (!newMessage.includes(`{${key}}`)) continue;
    const eName = `ICU_${idx++}`;
    newMessage = newMessage.replace(`{${key}}`, `$${eName}$`);

    placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }

  return {message: newMessage, placeholders};
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

/**
 * Take a series of messages.json format ICU messages and converts them to
 * lighthouse-i18n-json format by replacing $placeholders$ with their {ICU}
 * values. Functional opposite of `convertMessageToPlaceholders`. This is
 * commonly called as the last step in translation, via correct-strings.js.
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

module.exports = {
  computeDescription,
  convertMessageToPlaceholders,
  createPsuedoLocaleStrings,
  bakePlaceholders,
};
