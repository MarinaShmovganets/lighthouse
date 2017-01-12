/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
  * @fileoverview Determines optimized jpeg/webp filesizes for all same-origin and dataURI images.
  */
'use strict';

const Gatherer = require('../gatherer');
const URL = require('../../../lib/url-shim');

/* global document */

/* istanbul ignore next */
function getOptimizedNumBytes(url) {
  return new Promise(function(resolve, reject) {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    function getTypeStats(type, quality) {
      const dataURI = canvas.toDataURL(type, quality);
      const base64 = dataURI.slice(dataURI.indexOf(',') + 1);
      return {base64: base64.length, binary: atob(base64).length};
    }

    document.body.appendChild(canvas);
    img.addEventListener('load', () => {
      try {
        canvas.height = img.height;
        canvas.width = img.width;
        context.drawImage(img, 0, 0);

        const jpeg = getTypeStats('image/jpeg', 0.8);
        const webp = getTypeStats('image/webp', 0.8);

        document.body.removeChild(canvas);
        resolve({jpeg, webp});
      } catch (err) {
        reject(err);
      }
    }, false);

    img.src = url;
  });
}

class OptimizedImages extends Gatherer {
  /**
   * @param {string} pageUrl
   * @param {NetworkRecords} networkRecords
   * @return {!Array.<!{url: string, isBase64DataUri: boolean, mimeType: string, resourceSize: number}>}
   */
  static filterImageRequests(pageUrl, networkRecords) {
    return networkRecords.reduce((prev, record) => {
      const isOptimizableImage = /image\/(png|bmp|jpeg)/.test(record._mimeType);
      const isSameOrigin = URL.hostsMatch(pageUrl, record._url);
      const isBase64DataUri = /^data.{2,40}base64/.test(record._url);

      if (isOptimizableImage && (isSameOrigin || isBase64DataUri)) {
        prev.push({
          isBase64DataUri,
          url: record._url,
          mimeType: record._mimeType,
          resourceSize: record._resourceSize,
        });
      }

      return prev;
    }, []);
  }

  /**
   * @param {Object} driver
   * @param {!{url: string, isBase64DataUri: boolean, resourceSize: number}} networkRecord
   * @return {!Promise.<!{originalSize: number, jpegSize: number, webpSize: number}>}
   */
  calculateImageStats(driver, networkRecord) {
    const param = JSON.stringify(networkRecord.url);
    const script = `(${getOptimizedNumBytes.toString()})(${param})`;
    return driver.evaluateAsync(script).then(stats => {
      const isBase64DataUri = networkRecord.isBase64DataUri;
      return {
        originalSize: isBase64DataUri ? networkRecord.url.length : networkRecord.resourceSize,
        jpegSize: isBase64DataUri ? stats.jpeg.base64 : stats.jpeg.binary,
        webpSize: isBase64DataUri ? stats.webp.base64 : stats.webp.binary,
      };
    });
  }

  afterPass(options, traceData) {
    const networkRecords = traceData.networkRecords;
    const imageRecords = OptimizedImages.filterImageRequests(options.url, networkRecords);

    return Promise.all(imageRecords.map(record => {
      return this.calculateImageStats(options.driver, record).catch(err => {
        return {failed: true, err};
      }).then(stats => {
        return Object.assign(stats, record);
      });
    })).then(results => {
      const successfulResults = results.filter(result => !result.failed);
      if (results.length && !successfulResults.length) {
        throw new Error('All image optimizations failed');
      }

      return results;
    }).catch(err => {
      return {rawValue: -1, debugString: err};
    });
  }
}

module.exports = OptimizedImages;
