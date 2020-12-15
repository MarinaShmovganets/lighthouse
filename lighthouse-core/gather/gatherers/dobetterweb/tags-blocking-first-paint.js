/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
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

const Gatherer = require('../gatherer.js');

/* global document, window, HTMLLinkElement */

/** @typedef {{href: string, media: string, msSinceHTMLEnd: number, matches: boolean}} MediaChange */
/** @typedef {{tagName: 'LINK', url: string, href: string, rel: string, media: string, disabled: boolean, mediaChanges: Array<MediaChange>}} LinkTag */
/** @typedef {{tagName: 'SCRIPT', url: string, src: string}} ScriptTag */
/** @typedef {import('../../driver.js')} Driver */

/* istanbul ignore next */
function installMediaListener() {
  // @ts-expect-error - inserted in page to track media changes.
  window.___linkMediaChanges = [];
  Object.defineProperty(HTMLLinkElement.prototype, 'media', {
    set: function(val) {
      /** @type {MediaChange} */
      const mediaChange = {
        href: this.href,
        media: val,
        msSinceHTMLEnd: Date.now() - window.performance.timing.responseEnd,
        matches: window.matchMedia(val).matches,
      };
      // @ts-expect-error - `___linkMediaChanges` created above.
      window.___linkMediaChanges.push(mediaChange);

      return this.setAttribute('media', val);
    },
  });
}

/**
 * @return {Promise<Array<LinkTag | ScriptTag>>}
 */
/* istanbul ignore next */
async function collectTagsThatBlockFirstPaint() {
  /** @type {Array<MediaChange>} */
  // @ts-expect-error - `___linkMediaChanges` created in `installMediaListener`.
  const linkMediaChanges = window.___linkMediaChanges;

  try {
    const linkTags = [...document.querySelectorAll('link')]
      .filter(/** @return {tag is HTMLLinkElement} */ tag => {
        if (tag.tagName !== 'LINK') return false;

        // Filter stylesheet/HTML imports that block rendering.
        // https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
        // https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
        const linkTag = /** @type {HTMLLinkElement} */ (tag);
        const blockingStylesheet = linkTag.rel === 'stylesheet' &&
          window.matchMedia(linkTag.media).matches && !linkTag.disabled;
        const blockingImport = linkTag.rel === 'import' && !linkTag.hasAttribute('async');
        return blockingStylesheet || blockingImport;
      })
      .map(tag => {
        return {
          tagName: /** @type {'LINK'} */ ('LINK'),
          url: tag.href,
          href: tag.href,
          rel: tag.rel,
          media: tag.media,
          disabled: tag.disabled,
          mediaChanges: linkMediaChanges.filter(item => item.href === tag.href),
        };
      });

    const scriptTags = [...document.querySelectorAll('head script[src]')]
      .filter(/** @return {tag is HTMLScriptElement} */ tag => {
        if (tag.tagName !== 'SCRIPT') return false;

        const scriptTag = /** @type {HTMLScriptElement} */ (tag);
        return (
          !scriptTag.hasAttribute('async') &&
          !scriptTag.hasAttribute('defer') &&
          !/^data:/.test(scriptTag.src) &&
          !/^blob:/.test(scriptTag.src) &&
          scriptTag.getAttribute('type') !== 'module'
        );
      })
      .map(tag => {
        return {
          tagName: /** @type {'SCRIPT'} */ ('SCRIPT'),
          url: tag.src,
          src: tag.src,
        };
      });

    return [...linkTags, ...scriptTags];
  } catch (e) {
    const friendly = 'Unable to gather Scripts/Stylesheets/HTML Imports on the page';
    throw new Error(`${friendly}: ${e.message}`);
  }
}

class TagsBlockingFirstPaint extends Gatherer {
  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Map<string, LH.Artifacts.NetworkRequest>}
   */
  static _filteredAndIndexedByUrl(networkRecords) {
    /** @type {Map<string, LH.Artifacts.NetworkRequest>} */
    const result = new Map();

    for (const record of networkRecords) {
      if (!record.finished) continue;

      const isParserGenerated = record.initiator.type === 'parser';
      // A stylesheet only blocks script if it was initiated by the parser
      // https://html.spec.whatwg.org/multipage/semantics.html#interactions-of-styling-and-scripting
      const isParserScriptOrStyle = /(css|script)/.test(record.mimeType) && isParserGenerated;
      const isFailedRequest = record.failed;
      const isHtml = record.mimeType && record.mimeType.includes('html');

      // Filter stylesheet, javascript, and html import mimetypes.
      // Include 404 scripts/links generated by the parser because they are likely blocking.
      if (isHtml || isParserScriptOrStyle || (isFailedRequest && isParserGenerated)) {
        result.set(record.url, record);
      }
    }

    return result;
  }

  /**
   * @param {Driver} driver
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Promise<Array<LH.Artifacts.TagBlockingFirstPaint>>}
   */
  static async findBlockingTags(driver, networkRecords) {
    const firstRequestEndTime = networkRecords.reduce(
      (min, record) => Math.min(min, record.endTime),
      Infinity
    );
    const tags = await driver.evaluate(collectTagsThatBlockFirstPaint, {args: []});
    const requests = TagsBlockingFirstPaint._filteredAndIndexedByUrl(networkRecords);

    /** @type {Array<LH.Artifacts.TagBlockingFirstPaint>} */
    const result = [];
    for (const tag of tags) {
      const request = requests.get(tag.url);
      if (!request || request.isLinkPreload) continue;

      let endTime = request.endTime;
      if (tag.tagName === 'LINK') {
        // Even if the request was initially blocking or appeared to be blocking once the
        // page was loaded, the media attribute could have been changed during load, capping the
        // amount of time it was render blocking. See https://github.com/GoogleChrome/lighthouse/issues/2832.
        const timesResourceBecameNonBlocking = tag.mediaChanges
          .filter(change => !change.matches)
          .map(change => change.msSinceHTMLEnd);
        const earliestNonBlockingTime = Math.min(...timesResourceBecameNonBlocking);
        const lastTimeResourceWasBlocking = Math.max(
          request.startTime,
          firstRequestEndTime + earliestNonBlockingTime / 1000
        );
        endTime = Math.min(endTime, lastTimeResourceWasBlocking);
      }

      const {tagName, url} = tag;

      result.push({
        tag: {tagName, url},
        transferSize: request.transferSize,
        startTime: request.startTime,
        endTime,
      });

      // Prevent duplicates from showing up again
      requests.delete(tag.url);
    }

    return result;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    // Don't return return value of `evaluateScriptOnNewDocument`.
    await passContext.driver.evaluateScriptOnNewDocument(`(${installMediaListener.toString()})()`);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['TagsBlockingFirstPaint']>}
   */
  afterPass(passContext, loadData) {
    return TagsBlockingFirstPaint.findBlockingTags(passContext.driver, loadData.networkRecords);
  }
}

module.exports = TagsBlockingFirstPaint;
