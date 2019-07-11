/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const correct = require('../../../scripts/i18n/correct-strings.js');

describe('Baking Placeholders', () => {
  it('passthroughs a basic message unchanged', () => {
    const strings = {
      hello: {
        message: 'world',
      },
    };
    const res = correct.bakePlaceholders(strings);
    expect(res).toEqual({
      hello: {
        message: 'world',
      },
    });
  });

  it('bakes a placeholder into the output string', () => {
    const strings = {
      hello: {
        message: '$MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    const res = correct.bakePlaceholders(strings);
    expect(res).toEqual({
      hello: {
        message: '`World`',
        placeholders: undefined,
      },
    });
  });

  it('throws when a placeholder cannot be found', () => {
    const strings = {
      hello: {
        message: '$MARKDOWN_SNIPPET_0$',
      },
    };
    expect(() => correct.bakePlaceholders(strings))
      .toThrow(/Message "\$MARKDOWN_SNIPPET_0\$" is missing placeholder/);
  });

  it('throws when a placeholder is not in string', () => {
    const strings = {
      hello: {
        message: 'World',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
          },
        },
      },
    };
    expect(() => correct.bakePlaceholders(strings))
      .toThrow(/Message "World" has extra placeholder "MARKDOWN_SNIPPET_0"/);
  });
});
