/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('./byte-efficiency-audit');

const IGNORE_THRESHOLD_IN_PERCENT = 5;
const IGNORE_THRESHOLD_IN_BYTES = 512;

const ESCAPE_SLASH = '\\';

/**
 * @fileOverview
 */
class UnminifiedCSS extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'unminified-css',
      description: 'Minify CSS',
      informative: true,
      helpText: 'Minifying CSS files can reduce network payload sizes.' +
        '[Learn more](https://developers.google.com/speed/docs/insights/MinifyResources).',
      requiredArtifacts: ['Styles', 'devtoolsLogs'],
    };
  }

  /**
   * Computes the total length of the meaningful tokens (CSS excluding comments and whitespace).
   *
   * @param {string} content
   * @return {number}
   */
  static computeTokenLength(content) {
    let totalTokenLength = 0;
    let isInComment = false;
    let isInString = false;
    let stringStarter = null;

    for (let i = 0; i < content.length; i++) {
      const char = content.charAt(i);
      const nextChar = content.charAt(i + 1);
      const chars = char + nextChar;

      const isWhitespace = /\s/.test(char);
      const isStringStarter = /('|")/.test(char);

      if (isInComment) {
        if (chars === '*/') {
          isInComment = false;
          i++;
        }
      } else if (isInString) {
        totalTokenLength++;
        if (chars === ESCAPE_SLASH) {
          totalTokenLength++;
          i++;
        } else if (char === stringStarter) {
          isInString = false;
          totalTokenLength++;
          i++;
        }
      } else {
        if (chars === '/*') {
          isInComment = true;
          i++;
        } else if (isStringStarter) {
          isInString = true;
          stringStarter = char;
          totalTokenLength++;
        } else if (!isWhitespace) {
          totalTokenLength++;
        }
      }
    }

    // If the content contained unbalanced comments, it's either invalid or we had a parsing error.
    // Report the token length as the entire string so it will be ignored.
    if (isInComment) {
      return content.length;
    }

    return totalTokenLength;
  }

  /**
   * @param {string} stylesheet
   * @return {{minifiedLength: number, contentLength: number}}
   */
  static computeWaste(stylesheet, networkRecord) {
    const content = stylesheet.content;
    const totalTokenLength = UnminifiedCSS.computeTokenLength(content);

    const totalBytes = ByteEfficiencyAudit.estimateTransferSize(networkRecord, content.length,
      'stylesheet');
    const wastedRatio = 1 - totalTokenLength / content.length;
    const wastedBytes = Math.round(totalBytes * wastedRatio);

    return {
      url: networkRecord.url,
      totalBytes,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!Audit.HeadingsResult}
   */
  static audit_(artifacts, networkRecords) {
    const results = [];
    for (const stylesheet of artifacts.Styles.values()) {
      const networkRecord = networkRecords
        .find(record => record.url === stylesheet.header.sourceURL);
      if (!networkRecord || !stylesheet.content) continue;

      const result = UnminifiedCSS.computeWaste(stylesheet, networkRecord);

      // If the ratio is minimal, the file is likely already minified, so ignore it.
      // If the total number of bytes to be saved is quite small, it's also safe to ignore.
      if (result.wastedPercent < IGNORE_THRESHOLD_IN_PERCENT ||
          result.wastedBytes < IGNORE_THRESHOLD_IN_BYTES) continue;
      results.push(result);
    }

    return {
      results,
      headings: [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'totalKb', itemType: 'text', text: 'Original'},
        {key: 'potentialSavings', itemType: 'text', text: 'Potential Savings'},
      ],
    };
  }
}

module.exports = UnminifiedCSS;
