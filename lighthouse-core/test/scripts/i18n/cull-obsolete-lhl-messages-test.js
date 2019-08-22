/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const cullObsoleteLhlMessages = require('../../../scripts/i18n/cull-obsolete-lhl-messages.js');

/**
 * Cull `localeLhl` based on `goldenLhl`.
 * @param {Record<string, {message: string}>} goldenLhl
 * @param {Record<string, {message: string}>} localeLhl
 */
function cullLocale(goldenLhl, localeLhl) {
  // Suppress logging by adding all message ids to the already-logged set.
  const loggedCulls = new Set(Object.keys(localeLhl));

  const goldenLocaleArgumentIds = cullObsoleteLhlMessages.getGoldenLocaleArgumentIds(goldenLhl);
  return cullObsoleteLhlMessages.cullLocale(goldenLocaleArgumentIds, localeLhl, loggedCulls);
}

describe('Cull obsolete translations', () => {
  const goldenLhl = {
    plainString: {
      message: 'Plain string',
    },
    displayValue: {
      message: 'Total size was {totalBytes, number, bytes} KB',
    },
    nestedInPlural: {
      // Ensure nested arguments are parsed and handled.
      // eslint-disable-next-line max-len
      message: '{requestCount, plural, =1 {1 request • {byteCount, number, bytes} KB} other {# requests • {byteCount, number, bytes} KB}}',
    },
  };

  it('removes nothing if the messages are exactly the same', () => {
    const culledLocale = cullLocale(goldenLhl, goldenLhl);
    expect(culledLocale).toEqual(goldenLhl);
  });

  it('removes nothing if the text differs but the message and argument ids are the same', () => {
    const localeLhl = {
      plainString: {
        message: 'Some other string',
      },
      displayValue: {
        message: 'So we have...{totalBytes, number, bytes} sure, KB, why not',
      },
      nestedInPlural: {
        // eslint-disable-next-line max-len
        message: '{requestCount, plural, =1 {1 llama • {byteCount, number, bytes} KB} other {# llamas • {byteCount, number, bytes} KB}}',
      },
    };

    const culledLocale = cullLocale(goldenLhl, localeLhl);
    expect(culledLocale).toEqual(localeLhl);
  });

  it('removes messages not in the golden LHL', () => {
    const localeLhl = {
      ...goldenLhl,
      obsoleteValue: {
        message: 'string with one {argument}',
      },
    };

    const culledLocale = cullLocale(goldenLhl, localeLhl);
    expect(culledLocale).toEqual(goldenLhl);
  });

  it('removes messages with different arguments than found in the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      displayValue: {
        message: 'Total size was {differentArgument, number, bytes} KB',
      },
    };

    const culledLocale = cullLocale(goldenLhl, localeLhl);
    expect(culledLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });

  it('removes messages with different number of arguments than found in the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      displayValue: {
        message: 'Total size was {totalBytes, number, bytes} KB, {salutation}!',
      },
    };

    const culledLocale = cullLocale(goldenLhl, localeLhl);
    expect(culledLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });

  it('removes messages when a nested argument differs from the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      nestedInPlural: {
        // eslint-disable-next-line max-len
        message: '{requestCount, plural, =1 {1 request • {timeInMs, number, seconds} s} other {# requests • {timeInMs, number, seconds} s}}',
      },
    };

    const culledLocale = cullLocale(goldenLhl, localeLhl);
    expect(culledLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });
});
