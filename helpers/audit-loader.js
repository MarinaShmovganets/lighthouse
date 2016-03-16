/**
 * Copyright 2015 Google Inc. All rights reserved.
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

let walk = require('walk');
let path = require('path');
let fs = require('fs');

let audits = {};

module.exports = {
  getAudits: function(filePath) {
    if (typeof audits[filePath] !== 'undefined') {
      return audits[filePath];
    }

    let fullFilePath = path.join(__dirname, '../', filePath);
    let walker = walk.walk(fullFilePath);

    return new Promise((resolve, reject) => {
      walker.on('file', (root, fileStats, next) => {
        if (fileStats.name !== 'package.json') {
          return next();
        }

        fs.readFile(root + '/' + fileStats.name, (err, data) => {
          if (err) {
            return next();
          }

          let audit = JSON.parse(data);
          audits[audit.name] = {
            main: root + '/' + audit.main
          };

          next();
        });
      });

      walker.on('end', () => {
        resolve(audits);
      });
    });
  }
};
