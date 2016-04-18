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

const Report = require('../report');
const fs = require('fs');

class BrowserReport extends Report {

  getFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, source) => {
        if (err) {
          return reject(err);
        }

        resolve(source);
      });
    });
  }

  getReportHTML() {
    return this.getFile('./report/templates/report.html');
  }

  getReportCSS() {
    return this.getFile('./report/styles/report.css');
  }
}

module.exports = BrowserReport;
