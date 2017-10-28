/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
  * @fileoverview
  *   Identifies stylesheets, HTML Imports, and scripts that potentially block
  *   the first paint of the page by running several scripts in the page context.
  *   Candidate blocking tags are collected by querying for all script tags in
  *   the head of the page and all link tags that are either matching media
  *   stylesheets or non-async HTML imports. These are then compared to the
  *   network requests to ensure they were initiated by the parser and not
  *   injected with script. To avoid false positives from strategies like
  *   (http://filamentgroup.github.io/loadCSS/test/preload.html), a separate
  *   script is run to flag all links that at one point were rel=preload.
  */

'use strict';

const Gatherer = require('../gatherer');

/* global document,window */

/* istanbul ignore next */
function collectTagsThatBlockFirstPaint() {
  return new Promise((resolve, reject) => {
    try {
      const tagList = [...document.querySelectorAll('link, head script[src], script[type]')]
        .filter(tag => {
          if (tag.tagName === 'SCRIPT') {
            return !tag.hasAttribute('async') &&
                !tag.hasAttribute('defer') &&
                !/^data:/.test(tag.src) &&
                !(tag.getAttribute('type') === 'module');
          }

          // Filter stylesheet/HTML imports that block rendering.
          // https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
          // https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
          const blockingStylesheet = (tag.rel === 'stylesheet' &&
              window.matchMedia(tag.media).matches && !tag.disabled);
          const blockingImport = tag.rel === 'import' && !tag.hasAttribute('async');
          return blockingStylesheet || blockingImport;
        })
        .map(tag => {
          return {
            tagName: tag.tagName,
            url: tag.tagName === 'LINK' ? tag.href : tag.src,
            src: tag.src,
            href: tag.href,
            rel: tag.rel,
            media: tag.media,
            disabled: tag.disabled,
          };
        });
      resolve(tagList);
    } catch (e) {
      const friendly = 'Unable to gather Scripts/Stylesheets/HTML Imports on the page';
      reject(new Error(`${friendly}: ${e.message}`));
    }
  });
}

function filteredAndIndexedByUrl(networkRecords) {
  return networkRecords.reduce((prev, record) => {
    if (!record.finished) {
      return prev;
    }

    const isParserGenerated = record._initiator.type === 'parser';
    // A stylesheet only blocks script if it was initiated by the parser
    // https://html.spec.whatwg.org/multipage/semantics.html#interactions-of-styling-and-scripting
    const isParserScriptOrStyle = /(css|script)/.test(record._mimeType) && isParserGenerated;
    const isFailedRequest = record._failed;
    const isHtml = record._mimeType && record._mimeType.includes('html');

    // Filter stylesheet, javascript, and html import mimetypes.
    // Include 404 scripts/links generated by the parser because they are likely blocking.
    if (isHtml || isParserScriptOrStyle || (isFailedRequest && isParserGenerated)) {
      prev[record._url] = {
        isLinkPreload: record.isLinkPreload,
        transferSize: record._transferSize,
        startTime: record._startTime,
        endTime: record._endTime,
      };
    }

    return prev;
  }, {});
}

class TagsBlockingFirstPaint extends Gatherer {
  constructor() {
    super();
    this._filteredAndIndexedByUrl = filteredAndIndexedByUrl;
  }

  static findBlockingTags(driver, networkRecords) {
    const scriptSrc = `(${collectTagsThatBlockFirstPaint.toString()}())`;
    return driver.evaluateAsync(scriptSrc).then(tags => {
      const requests = filteredAndIndexedByUrl(networkRecords);

      return tags.reduce((prev, tag) => {
        const request = requests[tag.url];
        if (request && !request.isLinkPreload) {
          prev.push({
            tag,
            transferSize: request.transferSize || 0,
            startTime: request.startTime,
            endTime: request.endTime,
          });

          // Prevent duplicates from showing up again
          requests[tag.url] = null;
        }

        return prev;
      }, []);
    });
  }

  /**
   * @param {!Object} options
   * @param {{networkRecords: !Array<!NetworkRecord>}} tracingData
   * @return {!Array<{tag: string, transferSize: number, startTime: number, endTime: number}>}
   */
  afterPass(options, tracingData) {
    return TagsBlockingFirstPaint.findBlockingTags(options.driver, tracingData.networkRecords);
  }
}

module.exports = TagsBlockingFirstPaint;
