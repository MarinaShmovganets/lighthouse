/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const acorn = require('acorn');
const MagicString = require('magic-string').default;

// ESTree provides much better types for AST nodes. See https://github.com/acornjs/acorn/issues/946
/** @typedef {import('estree').Node} Node */
/** @typedef {import('estree').SimpleCallExpression} SimpleCallExpression */

/**
 * Inlines the values of selected `fs` methods if their targets can be
 * statically determined. Currently `readFileSync` and `readdirSync` are
 * supported.
 * Returns `null` as code if no changes were made.
 * @param {string} code
 * @return {Promise<string|null>}
 */
async function inlineFs(code) {
  // Approach:
  // - scan `code` for fs methods
  // - parse only the expression at each found index
  // - statically evaluate arguments to fs method, collapsing to single string
  // - execute fs method with computed argument
  // - replace original expression with result of fs call
  // - if an expression cannot be parsed or statically evaluated, warn and skip
  // - if no expressions found or all are skipped, return null

  const fsSearch = /fs\.(?:readFileSync|readdirSync)\(/g;
  const foundIndices = [...code.matchAll(fsSearch)].map(e => e.index);

  // Return null for not-applicable files with as little work as possible.
  if (foundIndices.length === 0) return null;

  const output = new MagicString(code);
  let madeChange = false;

  // Can iterate forwards in string because MagicString always uses original indices.
  for (const foundIndex of foundIndices) {
    if (foundIndex === undefined) continue; // https://github.com/microsoft/TypeScript/issues/36788

    let parsed;
    try {
      parsed = parseExpressionAt(code, foundIndex, {ecmaVersion: 'latest'});
    } catch (err) {
      console.warn(err.message);
      continue;
    }

    // If root of expression isn't the fs call, descend down chained methods on
    // the result (e.g. `fs.readdirSync().map(...)`) until reaching the fs call.
    for (;;) {
      assertEqualString(parsed.type, 'CallExpression');
      assertEqualString(parsed.callee.type, 'MemberExpression');
      if (parsed.callee.object.type === 'Identifier' && parsed.callee.object.name === 'fs') {
        break;
      }
      parsed = parsed.callee.object;
    }

    // We've regexed for an fs method, so the property better be an identifier.
    assertEqualString(parsed.callee.property.type, 'Identifier');

    let content;
    try {
      if (parsed.callee.property.name === 'readFileSync') {
        content = await getReadFileReplacement(parsed);
      } else if (parsed.callee.property.name === 'readdirSync') {
        content = await getReaddirReplacement(parsed);
      } else {
        throw new Error(`unexpected fs call 'fs.${parsed.callee.property.name}'`);
      }
    } catch (err) {
      console.warn(err.message);
      continue;
    }

    // @ts-expect-error - `start` and `end` provided by acorn on top of ESTree types.
    const {start, end} = parsed;
    // TODO(bckenny): use options to customize `storeName` for source maps.
    output.overwrite(start, end, content);
    madeChange = true;
  }

  // Be explicit if no change has been made.
  const outputCode = madeChange ? output.toString() : null;

  return outputCode;
}

/**
 * A version of acorn's parseExpressionAt that stops at commas, allowing parsing
 * non-sequence expressions (like inside arrays).
 * @param {string} input
 * @param {number} offset
 * @param {import('acorn').Options} options
 * @return {Node}
 */
function parseExpressionAt(input, offset, options) {
  const parser = new acorn.Parser(options, input, offset);
  parser.nextToken();
  return parser.parseMaybeAssign();
}

/**
 * Uses assert.strictEqual, but does not widen the type to generic `string`,
 * preserving string literals (if applicable).
 * @template {string} T
 * @param {string} actual
 * @param {T} expected
 * @param {string=} errorMessage
 * @return {asserts actual is T}
 */
function assertEqualString(actual, expected, errorMessage) {
  assert.equal(actual, expected, errorMessage);
}

/**
 * Attempts to statically determine the target of a `fs.readFileSync()` call and
 * returns the already-quoted contents of the file to be loaded.
 * If it's a JS file, it's minified before inlining.
 * @param {SimpleCallExpression} node ESTree node for `fs.readFileSync` call.
 * @return {Promise<string>}
 */
async function getReadFileReplacement(node) {
  assertEqualString(node.callee.type, 'MemberExpression');
  assertEqualString(node.callee.property.type, 'Identifier');
  assert.equal(node.callee.property.name, 'readFileSync');

  assert.equal(node.arguments.length, 2, 'fs.readFileSync() must have two arguments');
  const constructedPath = collapseToStringLiteral(node.arguments[0]);
  assert.equal(isUtf8Options(node.arguments[1]), true, 'only utf8 readFileSync is supported');

  const readContent = await fs.promises.readFile(constructedPath, 'utf8');

  // TODO(bckenny): minify inlined javascript.

  // Escape quotes, new lines, etc so inlined string doesn't break host file.
  return JSON.stringify(readContent);
}

/**
 * Attempts to statically determine the target of a `fs.readdirSync()` call and
 * returns a JSON.stringified array with the contents of the target directory.
 * @param {SimpleCallExpression} node ESTree node for `fs.readdirSync` call.
 * @return {Promise<string>}
 */
async function getReaddirReplacement(node) {
  assertEqualString(node.callee.type, 'MemberExpression');
  assertEqualString(node.callee.property.type, 'Identifier');
  assert.equal(node.callee.property.name, 'readdirSync');

  // If there's no second argument, fs.readdirSync defaults to 'utf8'.
  if (node.arguments.length === 2) {
    assert.equal(isUtf8Options(node.arguments[1]), true, 'only utf8 readdirSync is supported');
  }

  const constructedPath = collapseToStringLiteral(node.arguments[0]);

  try {
    const contents = await fs.promises.readdir(constructedPath, 'utf8');
    return JSON.stringify(contents);
  } catch (err) {
    throw new Error(`could not inline fs.readdirSync call: ${err.message}`);
  }
}

/**
 * Returns whether the options object/string specifies the allowed utf8/utf-8
 * encoding.
 * @param {Node} node ESTree node.
 * @return {boolean}
 */
function isUtf8Options(node) {
  // Node allows 'utf-8' as an alias for 'utf8'.
  if (node.type === 'Literal') {
    return node.value === 'utf8' || node.value === 'utf-8';
  } else if (node.type === 'ObjectExpression') {
    // Matches type `{encoding: 'utf8'|'utf-8'}`.
    return node.properties.some(prop => {
      return prop.type === 'Property' &&
          prop.key.type === 'Identifier' && prop.key.name === 'encoding' &&
          prop.value.type === 'Literal' &&
          (prop.value.value === 'utf8' || prop.value.value === 'utf-8');
    });
  }
  return false;
}

/**
 * Collapse tree at `node` using supported transforms until only a string
 * literal is returned (or an error is thrown for unsupported nodes).
 * @param {Node} node ESTree node.
 * @return {string}
 */
function collapseToStringLiteral(node) {
  // TODO(bckenny): support more than string literals.
  switch (node.type) {
    case 'Literal': {
      // If your literal wasn't a string, sorry, you're getting a string.
      return String(node.value);
    }
  }

  throw new Error(`unsupported node: ${node.type}`);
}

module.exports = {
  inlineFs,
};
