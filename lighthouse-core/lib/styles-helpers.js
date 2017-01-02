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
 * Filters a list of stylesheets for usage of a CSS property name, value,
 * or name/value pair.
 *
 * @param {!Array} stylesheets A list of stylesheets used by the page.
 * @param {string|string[]=} propName Optional name of the CSS property/propertys to filter
 *     results on. If propVal is not specified, all stylesheets that use the property are
 *     returned. Otherwise, stylesheets that use the propName: propVal are returned.
 * @param {string|string[]=} propVal Optional value of the CSS property/propertys to filter
 *     results on.
 * @return {!Array} A list of stylesheets that use the CSS property.
 */
function filterStylesheetsByUsage(stylesheets, propName, propVal) {
  if (!propName && !propVal) {
    return [];
  }
  // Create deep clone of arrays so multiple calls to filterStylesheetsByUsage
  // don't alter the original artifacts in stylesheets arg.
  const deepClone = stylesheets.map(sheet => Object.assign({}, sheet));

  return deepClone.filter(s => {
    s.parsedContent = s.parsedContent.filter(item => {
      let usedName = '';
      let usedVal = '';
      // Prevent indexOf on null value
      if (propName) {
        usedName = propName.indexOf(item.property.name) > -1;
      }
      if (propVal) {
        usedVal = propVal.indexOf(item.property.val) > -1;
      }
      // Allow search by css property name, a value, or name/value pair.
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
 * Returns a formatted snippet of CSS and the location of its use.
 *
 * @param {!string} content CSS text content.
 * @param {!Object} parsedContent The parsed version content.
 * @return {{styleRule: string, location: string}} Formatted output.
 */
function getFormattedStyleRule(content, parsedContent) {
  const lines = content.split('\n');

  const declarationRange = parsedContent.declarationRange;

  const startLine = declarationRange.startLine;
  const endLine = declarationRange.endLine;
  const start = declarationRange.startColumn;
  const end = declarationRange.endColumn;

  let rule;
  if (startLine === endLine) {
    rule = lines[startLine].substring(start, end);
  } else {
    // If css property value spans multiple lines, include all of them so it's
    // obvious where the value was used.
    rule = lines.slice(startLine, endLine + 1).reduce((prev, line) => {
      prev.push(line);
      return prev;
    }, []).join('\n');
  }

  const block = `
${parsedContent.selector} {
  ${rule}
}`;

  return {
    styleRule: block.trim(),
    location: `line: ${startLine}, row: ${start}, col: ${end}`
  };
}

module.exports = {
  filterStylesheetsByUsage,
  getFormattedStyleRule
};
