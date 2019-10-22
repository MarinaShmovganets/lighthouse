/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview
 * Define message file to be used for a given locale. A few aliases are defined below.
 *
 * Google locale inheritance rules: https://goto.google.com/ccssm
 * CLDR language aliases: https://www.unicode.org/cldr/charts/latest/supplemental/aliases.html
 * CLDR locale inheritance: https://github.com/unicode-cldr/cldr-core/blob/master/supplemental/parentLocales.json
 */

// TODO(paulirish): Centralize locale inheritance (combining this & i18n.lookupLocale()), adopt cldr parentLocale rules.

/** @typedef {Record<string, {message: string}>} LhlMessages */

// The keys within this const must exactly match the LH.Locale type in externs.d.ts
/** @type {Record<LH.Locale, LhlMessages>} */
const locales = {
  'en-US': require('./locales/en-US.json'), // The 'source' strings, with descriptions

  // TODO: en-GB has just ~10 messages that are different from en-US. We should only ship those.
  'en-GB': require('./locales/en-GB.json'), // Alias of 'en-GB'

  // All locales from here have a messages file, though we allow fallback to the base locale when the files are identical
  'ar-XB': require('./locales/ar-XB.json'), // psuedolocalization
  'ar': require('./locales/ar.json'),
  'bg': require('./locales/bg.json'),
  'ca': require('./locales/ca.json'),
  'cs': require('./locales/cs.json'),
  'da': require('./locales/da.json'),
  'de': require('./locales/de.json'), // de-AT, de-CH identical, so they fall back into de
  'el': require('./locales/el.json'),
  'en-XA': require('./locales/en-XA.json'), // psuedolocalization
  'en-XL': require('./locales/en-XL.json'), // local psuedolocalization
  'es': require('./locales/es.json'),
  'es-419': require('./locales/es-419.json'),
  'fi': require('./locales/fi.json'),
  'fil': require('./locales/fil.json'),
  'fr': require('./locales/fr.json'), // fr-CH identical, so it falls back into fr
  'he': require('./locales/he.json'),
  'hi': require('./locales/hi.json'),
  'hr': require('./locales/hr.json'),
  'hu': require('./locales/hu.json'),
  'id': require('./locales/id.json'),
  'it': require('./locales/it.json'),
  'ja': require('./locales/ja.json'),
  'ko': require('./locales/ko.json'),
  'lt': require('./locales/lt.json'),
  'lv': require('./locales/lv.json'),
  'nl': require('./locales/nl.json'),
  'no': require('./locales/no.json'),
  'pl': require('./locales/pl.json'),
  'pt': require('./locales/pt.json'), // pt-BR identical, so it falls back into pt
  'pt-PT': require('./locales/pt-PT.json'),
  'ro': require('./locales/ro.json'),
  'ru': require('./locales/ru.json'),
  'sk': require('./locales/sk.json'),
  'sl': require('./locales/sl.json'),
  'sr': require('./locales/sr.json'),
  'sr-Latn': require('./locales/sr-Latn.json'),
  'sv': require('./locales/sv.json'),
  'ta': require('./locales/ta.json'),
  'te': require('./locales/te.json'),
  'th': require('./locales/th.json'),
  'tr': require('./locales/tr.json'),
  'uk': require('./locales/uk.json'),
  'vi': require('./locales/vi.json'),
  'zh': require('./locales/zh.json'), // aka ZH-Hans, sometimes seen as zh-CN, zh-Hans-CN, Simplified Chinese
  'zh-HK': require('./locales/zh-HK.json'), // aka zh-Hant-HK. Note: yue-Hant-HK is not supported.
  'zh-TW': require('./locales/zh-TW.json'), // aka zh-Hant, zh-Hant-TW, Traditional Chinese
};

module.exports = locales;
