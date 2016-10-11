/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @param {!Array} stylesheets A list of stylesheets used by the page.
 * @param {string=} propName Optional name of the CSS property to filter results
 *     on. If propVal is not specified, all stylesheets that use the property are
 *     returned. Otherwise, stylesheets that use the propName: propVal are returned.
 * @param {string=} propVal Optional value of the CSS property to filter results on.
 * @return {Array} A list of stylesheets that use the CSS property.
 */
function stylesheetsThatUsedProperty(stylesheets, propName, propVal) {
  if (!propName && !propVal) {
    return [];
  }

  return stylesheets.slice(0).filter(s => {
    s.parsedContent = s.parsedContent.filter(item => {
      const usedName = item.property.name === propName;
      const usedVal = item.property.val.indexOf(propVal) === 0; // val should start with needle
      if (propName && !propVal) {
        return usedName;
      } else if (!propName && propVal) {
        return usedVal;
      } else if (propName && propVal) {
        return usedName && usedVal;
      }
      return false;
    });
    return s.parsedContent.length > 0;
  });
}

/**
 * @param {!string} content CSS text content.
 * @param {!Object} parsedContent Parsed CSS content.
 * @return {string} Formatted output
 */
function getFormattedStyleContent(content, parsedContent) {
  const lines = content.split('\n');

  const declarationRange = parsedContent.declarationRange;
  const lineNum = declarationRange.startLine;
  const start = declarationRange.startColumn;
  const end = declarationRange.endColumn;

  let rule;
  if (declarationRange.startLine === declarationRange.endLine) {
    rule = lines[lineNum].substring(start, end);
  } else {
    const startLine = lines[declarationRange.startLine];
    const endLine = lines[declarationRange.endLine];
    rule = lines.slice(startLine, endLine).reduce((prev, line) => {
      prev.push(line.substring(
          declarationRange.startColumn, declarationRange.endColumn));
      return prev;
    }, []).join('\n');
  }

  const block = `
${parsedContent.selector} {
  ${rule}
} (line: ${lineNum}, row: ${start}, col: ${end})`;

  return block;
}

module.exports = {
  stylesheetsThatUsedProperty,
  getFormattedStyleContent
};
