/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const http = require('http');
const https = require('https');

/**
 * @param {string} url
 * @return {Promise<Buffer>}
 */
function fetch(url) {
  const htt = url.startsWith('https') ? https : http;
  return new Promise(function(resolve, reject) {
    const req = htt.get(url, res => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`failed fetching ${url}: status code ${res.statusCode}`));
      }

      /** @type {Buffer[]} */
      const body = [];
      res.on('data', function(chunk) {
        body.push(chunk);
      });

      res.on('end', function() {
        try {
          resolve(Buffer.concat(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = fetch;
module.exports.supported = true;
