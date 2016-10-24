/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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
'use strict';

const Gatherer = require('./gatherer');
/* global document */

// This is run in the page, not Lighthouse itself.
/* istanbul ignore next */
function getInVisibleImages(range, size) {
  const invisibleImages = [... document.querySelectorAll('img')].map(img => {
    return [img.getBoundingClientRect(), img];
  }).reduce((prev, data) => {
    const info = data[0];
    const img = data[1];
    if (
      img.src !== '' &&
      info.width > size.width && info.height > size.height &&
      (info.top < range.top * -1 ||
      info.top > document.documentElement.clientHeight + range.bottom ||
      info.left < range.left * -1 ||
      info.left > document.documentElement.clientWidth + range.right)
    ) {
      prev[img.src] = {
        url: img.src,
        box: {
          top: info.top,
          bottom: info.bottom,
          left: info.left,
          right: info.right,
          width: info.width,
          height: info.height
        }
      };
    }
    return prev;
  }, {});

  return Promise.resolve(invisibleImages);
}

function reviseRange(param) {
  return JSON.stringify(['left', 'right', 'top', 'bottom'].reduce((prev, current) => {
    if (typeof param[current] === 'string') {
      if (current === 'left' || current === 'right' ||
         current === 'top' || current === 'bottom') {
        prev[current] = param[current].replace(/(device\-)(w|h)/, (_, a, b) => {
          return 'document.documentElement.client' + b.toUpperCase();
        });
      }
    } else {
      prev[current] = param[current] || 0;
    }
    return prev;
  }, {})).replace(/"/g, '');
}

function reviseSize(param) {
  param.width = param.width || 70;
  param.height = param.height || 70;
  return JSON.stringify(param);
}

class InvisibleImage extends Gatherer {

  afterPass(options, tracingData) {
    const driver = options.driver;
    const navigationRecord = tracingData.networkRecords.reduce((prev, record) => {
      if (/image/.test(record._mimeType)) {
        prev[record._url] = {
          transferSize: record._transferSize,
          filename: record._parsedURL.lastPathComponent,
          startTime: record._startTime,
          endTime: record._endTime,
          timing: record._timing
        };
      }
      return prev;
    }, {});

    const range = reviseRange(options.config.range || {});
    const size = reviseSize(options.config.size || {});
    return driver.evaluateAsync(`(${getInVisibleImages.toString()})(${range},${size})`)
      .then(data => {
        const filteredData = Object.keys(data).reduce((prev, url) => {
          if (navigationRecord[url]) {
            data[url].filename = navigationRecord[url].filename;
            data[url].perf = navigationRecord[url];
            data[url].perf.spendTime = data[url].perf.endTime - data[url].perf.startTime;
            prev.push(data[url]);
          }
          return prev;
        }, []);

        this.artifact = filteredData;
        return;
      }, _ => {
        this.artifact = [];
        return;
      });
  }
}

module.exports = InvisibleImage;
