/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const i18n = require('../../../lib/i18n/i18n.js');

/* eslint-env jest */

describe('i18n', () => {
  describe('#_formatPathAsString', () => {
    it('handles simple paths', () => {
      expect(i18n._formatPathAsString(['foo'])).toBe('foo');
      expect(i18n._formatPathAsString(['foo', 'bar', 'baz'])).toBe('foo.bar.baz');
    });

    it('handles array paths', () => {
      expect(i18n._formatPathAsString(['foo', 0])).toBe('foo[0]');
    });

    it('handles complex paths', () => {
      const propertyPath = ['foo', 'what-the', 'bar', 0, 'no'];
      expect(i18n._formatPathAsString(propertyPath)).toBe('foo[what-the].bar[0].no');
    });

    it('throws on unhandleable paths', () => {
      expect(() => i18n._formatPathAsString(['Bobby "DROP TABLE'])).toThrow(/Cannot handle/);
    });
  });

  describe('#createMessageInstanceIdFn', () => {
    it('returns a string reference', () => {
      const fakeFile = path.join(__dirname, 'fake-file.js');
      const templates = {daString: 'use me!'};
      const formatter = i18n.createMessageInstanceIdFn(fakeFile, templates);

      const expected = 'lighthouse-core/test/lib/i18n/fake-file.js | daString # 0';
      expect(formatter(templates.daString, {x: 1})).toBe(expected);
    });
  });

  describe('#replaceIcuMessageInstanceIds', () => {
    it('replaces the references in the LHR', () => {
      const templateID = 'lighthouse-core/test/lib/i18n/fake-file.js | daString';
      const reference = templateID + ' # 0';
      const lhr = {audits: {'fake-audit': {title: reference}}};

      const icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, 'en-US');
      expect(lhr.audits['fake-audit'].title).toBe('use me!');
      expect(icuMessagePaths).toEqual({
        [templateID]: [{path: 'audits[fake-audit].title', values: {x: 1}}]});
    });
  });

  describe('#getRendererFormattedStrings', () => {
    it('returns icu messages in the specified locale', () => {
      const strings = i18n.getRendererFormattedStrings('en-XA');
      expect(strings.passedAuditsGroupTitle).toEqual('[Þåššéð åûðîţš one two]');
      expect(strings.scorescaleLabel).toEqual('[Šçöŕé šçåļé: one two]');
    });
  });

  describe('#lookupLocale', () => {
    it('canonicalizes the locale', () => {
      expect(i18n.lookupLocale('en-xa')).toEqual('en-XA');
    });

    it('falls back to root tag prefix if specific locale not available', () => {
      expect(i18n.lookupLocale('en-JKJK')).toEqual('en');
    });

    it('falls back to en if no match is available', () => {
      expect(i18n.lookupLocale('jk-Latn-DE-1996-a-ext-x-phonebk-i-klingon')).toEqual('en');
    });
  });

  describe('#_formatIcuMessage', () => {
    it('formats a basic message', () => {
      expect(i18n._formatIcuMessage('en', '', 'Hello World')
        .formattedString).toEqual('Hello World');
    });

    it('formats a message with bytes', () => {
      expect(i18n._formatIcuMessage('en', '', 'Hello {in, number, bytes} World', {in: 1875})
      .formattedString).toEqual('Hello 2 World');
    });

    it('formats a message with milliseconds', () => {
      expect(i18n._formatIcuMessage('en', '', 'Hello {in, number, milliseconds} World', {in: 432})
      .formattedString).toEqual('Hello 430 World');
    });

    it('formats a message with bytes', () => {
      expect(i18n._formatIcuMessage('en', '', 'Hello {in, number, seconds} World', {in: 753})
      .formattedString).toEqual('Hello 753.0 World');
    });

    it('formats a message with bytes', () => {
      expect(i18n._formatIcuMessage('en', '', 'Hello {in, number, extendedPercent} World',
      {in: 0.43078}).formattedString).toEqual('Hello 43.08% World');
    });
  });

  describe('#_preprocessMessageValues', () => {
    it('preprocesses milliseconds', () => {
      expect(i18n._preprocessMessageValues('Hello {in, number, milliseconds} World', {in: 739}))
        .toEqual({in: 740});
    });

    it('preprocesses seconds when timeInMs', () => {
      expect(i18n._preprocessMessageValues('Hello {timeInMs, number, seconds} World',
        {timeInMs: 739432})).toEqual({timeInMs: 739.4});
    });

    it('preprocesses bytes', () => {
      expect(i18n._preprocessMessageValues('Hello {in, number, bytes} World', {in: 739432}))
        .toEqual({in: 722.1015625});
    });
  });
});
