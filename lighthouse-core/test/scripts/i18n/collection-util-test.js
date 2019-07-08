/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const collect = require('../../../scripts/i18n/collection-util.js');
const esprima = require('esprima');

describe('Compute Description', () => {
  it('collects description', () => {
    const justUIStrings =
    `const UIStrings = {
        /** Description for Hello World. */
        message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description).toBe('Description for Hello World.');
  });

  it('collects nothing, when no description present', () => {
    const justUIStrings =
    `const UIStrings = {
        message: 'Hello World',
        /** ^ no description for this one. */
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description).toBe(undefined);
  });

  it('collects complex description', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
  });

  it('collects complex description with example', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {variable} Variable example.
       */
      message: 'Hello World {variable}',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    const res = collect.computeDescription(ast, prop, 'Hello World {variable}', 0);
    expect(res.description).toBe('Tagged description for Hello World.');
    expect(res.examples['variable']).toBe('Variable example.');
  });

  it('errors when example given without variable', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       * @example {variable} Variable example.
       */
      message: 'Hello World',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    expect(() => collect.computeDescription(ast, prop, 'Hello World', 0))
      .toThrow(/Example missing ICU replacement/);
  });

  it('errors when variable has no example', () => {
    const justUIStrings =
    `const UIStrings = {
      /** 
       * @description Tagged description for Hello World.
       */
      message: 'Hello World {variable}',
    };`;

    const ast = esprima.parse(justUIStrings, {comment: true, range: true});

    const stmt = ast.body[0];
    const prop = stmt.declarations[0].init.properties[0];
    expect(() => collect.computeDescription(ast, prop, 'Hello World {variable}', 0))
      .toThrow(/Variable 'variable' is missing example comment/);
  });
});

describe('Convert Message to Placeholder', () => {
  it('passthroughs a basic message unchanged', () => {
    const message = 'Hello World.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res.message).toBe(message);
    expect(res.placeholders).toEqual({});
  });

  it('converts code block to placeholder', () => {
    const message = 'Hello `World`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('numbers code blocks in increasing order', () => {
    const message = '`Hello` `World`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = '$MARKDOWN_SNIPPET_0$ $MARKDOWN_SNIPPET_1$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`Hello`',
        example: 'Hello',
      },
      MARKDOWN_SNIPPET_1: {
        content: '`World`',
        example: 'World',
      },
    });
  });

  it('errors when open backtick', () => {
    const message = '`Hello World.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined))
      .toThrow(/Open backtick in message "`Hello World."/);
  });

  it('allows other markdown in code block', () => {
    const message = 'Hello World `[Link](https://google.com/)`.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello World $MARKDOWN_SNIPPET_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      MARKDOWN_SNIPPET_0: {
        content: '`[Link](https://google.com/)`',
        example: '[Link](https://google.com/)',
      },
    });
  });

  it('converts links to placeholders', () => {
    const message = 'Hello [World](https://google.com/).';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello $LINK_START_0$World$LINK_END_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      LINK_START_0: {
        content: '[',
      },
      LINK_END_0: {
        content: '](https://google.com/)',
      },
    });
  });

  it('catches common link markdown mistakes', () => {
    const message = 'Hello [World] (https://google.com/).';
    expect(() => collect.convertMessageToPlaceholders(message, undefined))
      .toThrow(/Bad Link syntax in message "Hello \[World\] \(https:\/\/google\.com\/\)\."/);
  });

  it('converts complex ICU to placholders', () => {
    const message = 'Hello World took {timeInMs, number, milliseconds} ms, ' +
      '{timeInSec, number, seconds} s, used {bytes, number, bytes} KB, ' +
      '{perc, number, percent} of {percEx, number, extendedPercent}.';

    const res = collect.convertMessageToPlaceholders(message, undefined);
    const expectation = 'Hello World took $COMPLEX_ICU_0$ ms, ' +
    '$COMPLEX_ICU_1$ s, used $COMPLEX_ICU_2$ KB, ' +
    '$COMPLEX_ICU_3$ of $COMPLEX_ICU_4$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      COMPLEX_ICU_0: {
        content: '{timeInMs, number, milliseconds}',
        example: '499',
      },
      COMPLEX_ICU_1: {
        content: '{timeInSec, number, seconds}',
        example: '2.4',
      },
      COMPLEX_ICU_2: {
        content: '{bytes, number, bytes}',
        example: '499',
      },
      COMPLEX_ICU_3: {
        content: '{perc, number, percent}',
        example: '54.6%',
      },
      COMPLEX_ICU_4: {
        content: '{percEx, number, extendedPercent}',
        example: '37.92%',
      },
    });
  });

  it('errors when using non-supported complex ICU format', () => {
    const message = 'Hello World took {var, number, global_int}.';
    expect(() => collect.convertMessageToPlaceholders(message, undefined)).toThrow(
      /Non supported ICU format in message "Hello World took {var, number, global_int}\."/);
  });

  it('converts direct ICU with examples to placeholders', () => {
    const message = 'Hello {name}.';
    const res = collect.convertMessageToPlaceholders(message, {name: 'Mary'});
    const expectation = 'Hello $ICU_0$.';
    expect(res.message).toBe(expectation);
    expect(res.placeholders).toEqual({
      ICU_0: {
        content: '{name}',
        example: 'Mary',
      },
    });
  });

  it('ignores direct ICU with no examples', () => {
    const message = 'Hello {name}.';
    const res = collect.convertMessageToPlaceholders(message, undefined);
    expect(res.message).toBe(message);
    expect(res.placeholders).toEqual({});
  });
});

describe('PseudoLocalizer', () => {
  it('adds cute hats to strings', () => {
    const strings = {
      hello: {
        message: 'world',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'ŵór̂ĺd̂',
      },
    });
  });

  it('does not pseudolocalize ICU messages', () => {
    const strings = {
      hello: {
        message: '{world}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{world}',
      },
    });
  });

  it('does not pseudolocalize ordinal ICU message control markers', () => {
    const strings = {
      hello: {
        message: '{num_worlds, plural, =1{world} other{worlds}}',
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: '{num_worlds, plural, =1{ŵór̂ĺd̂} other{ẃôŕl̂d́ŝ}}',
      },
    });
  });

  it('does not pseudolocalize placeholders', () => {
    const strings = {
      hello: {
        message: 'Hello $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    };
    const res = collect.createPsuedoLocaleStrings(strings);
    expect(res).toEqual({
      hello: {
        message: 'Ĥél̂ĺô $MARKDOWN_SNIPPET_0$',
        placeholders: {
          MARKDOWN_SNIPPET_0: {
            content: '`World`',
            example: 'World',
          },
        },
      },
    });
  });
});
