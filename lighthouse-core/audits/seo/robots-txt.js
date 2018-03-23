/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Validates robots.txt file according to the official standard and its various
 * extensions respected by the popular web crawlers.
 * - Google - https://developers.google.com/search/reference/robots_txt
 * - Bing - https://www.bing.com/webmaster/help/how-to-create-a-robots-txt-file-cb7c31ec
 * - Yandex - https://yandex.com/support/webmaster/controlling-robot/robots-txt.xml
 * - Yahoo - https://help.yahoo.com/kb/sln2213.html
 */

const Audit = require('../audit');
const URL = require('../../lib/url-shim');

const HTTP_CLIENT_ERROR_CODE_LOW = 400;
const HTTP_SERVER_ERROR_CODE_LOW = 500;

const DIRECTIVE_SITEMAP = 'sitemap';
const DIRECTIVE_USER_AGENT = 'user-agent';
const DIRECTIVE_ALLOW = 'allow';
const DIRECTIVE_DISALLOW = 'disallow';
const DIRECTIVES_GROUP_MEMBERS = new Set([DIRECTIVE_ALLOW, DIRECTIVE_DISALLOW]);
const DIRECTIVE_SAFELIST = new Set([
  DIRECTIVE_USER_AGENT, DIRECTIVE_DISALLOW, // standard
  DIRECTIVE_ALLOW, DIRECTIVE_SITEMAP, // universally supported
  'crawl-delay', // yahoo, bing, yandex
  'clean-param', 'host', // yandex
  'request-rate', 'visit-time', 'noindex', // not officially supported, but used in the wild
]);
const SITEMAP_VALID_PROTOCOLS = new Set(['https:', 'http:', 'ftp:']);

/**
 * @param {!string} directiveName
 * @param {!string} directiveValue
 * @throws will throw an exception if given directive is invalid
 */
function verifyDirective(directiveName, directiveValue) {
  if (!DIRECTIVE_SAFELIST.has(directiveName)) {
    throw new Error('Unknown directive');
  }

  if (directiveName === DIRECTIVE_SITEMAP) {
    let sitemapUrl;

    try {
      sitemapUrl = new URL(directiveValue);
    } catch (e) {
      throw new Error('Invalid sitemap URL');
    }

    if (!SITEMAP_VALID_PROTOCOLS.has(sitemapUrl.protocol)) {
      throw new Error('Invalid sitemap URL protocol');
    }
  }

  if (directiveName === DIRECTIVE_USER_AGENT && !directiveValue) {
    throw new Error('No user-agent specified');
  }

  if (directiveName === DIRECTIVE_ALLOW || directiveName === DIRECTIVE_DISALLOW) {
    if (directiveValue !== '' && directiveValue[0] !== '/' && directiveValue[0] !== '*') {
      throw new Error('Pattern should either be empty, start with "/" or "*"');
    }

    const dollarIndex = directiveValue.indexOf('$');

    if (dollarIndex !== -1 && dollarIndex !== directiveValue.length - 1) {
      throw new Error('"$" should only be used at the end of the pattern');
    }
  }
}

/**
 * @param {!string} line single line from a robots.txt file
 * @throws will throw an exception if given line has errors
 * @returns {!{directive: string, value: string}}
 */
function parseLine(line) {
  const hashIndex = line.indexOf('#');

  if (hashIndex !== -1) {
    line = line.substr(0, hashIndex);
  }

  line = line.trim();

  if (line.length === 0) {
    return {};
  }

  const colonIndex = line.indexOf(':');

  if (colonIndex === -1) {
    throw new Error('Syntax not understood');
  }

  const directiveName = line.slice(0, colonIndex).trim().toLowerCase();
  const directiveValue = line.slice(colonIndex + 1).trim();

  verifyDirective(directiveName, directiveValue);

  return {
    directive: directiveName,
    value: directiveValue,
  };
}

function validateRobots(content) {
  let inGroup = false;

  return content
    .split(/\r\n|\r|\n/)
    .map((line, index) => {
      let parsedLine;

      try {
        parsedLine = parseLine(line);
      } catch (e) {
        return {
          index: index + 1,
          line: line,
          error: e.message,
        };
      }

      // group-member records (allow, disallow) have to be precided with a start-of-group record (user-agent)
      // see: https://developers.google.com/search/reference/robots_txt#grouping-of-records
      if (parsedLine.directive === DIRECTIVE_USER_AGENT) {
        inGroup = true;
      } else if (!inGroup && DIRECTIVES_GROUP_MEMBERS.has(parsedLine.directive)) {
        return {
          index: index + 1,
          line: line,
          error: 'No user-agent specified',
        };
      }

      return null;
    })
    .filter(error => error !== null);
}

class RobotsTxt extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'robots-txt',
      description: 'robots.txt is valid',
      failureDescription: 'robots.txt is not valid',
      helpText: 'If your robots.txt file is malformed, crawlers may not be able to understand ' +
      'how you want your website to be crawled or indexed.',
      requiredArtifacts: ['RobotsTxt'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const {
      status,
      content,
    } = artifacts.RobotsTxt;

    if (!status) {
      return {
        rawValue: false,
        debugString: 'Lighthouse was unable to download your robots.txt file',
      };
    }

    if (status >= HTTP_SERVER_ERROR_CODE_LOW) {
      return {
        rawValue: false,
        displayValue: `request for robots.txt returned HTTP${status}`,
      };
    } else if (status >= HTTP_CLIENT_ERROR_CODE_LOW || content === '') {
      return {
        rawValue: true,
        notApplicable: true,
      };
    }

    const validationErrors = validateRobots(content);

    const headings = [
      {key: 'index', itemType: 'text', text: 'Line #'},
      {key: 'line', itemType: 'code', text: 'Content'},
      {key: 'error', itemType: 'code', text: 'Error'},
    ];

    const details = Audit.makeTableDetails(headings, validationErrors);
    let displayValue;

    if (validationErrors.length) {
      displayValue = validationErrors.length > 1 ?
        `${validationErrors.length} errors found` : '1 error found';
    }

    return {
      rawValue: validationErrors.length === 0,
      details,
      displayValue,
    };
  }
}

module.exports = RobotsTxt;
