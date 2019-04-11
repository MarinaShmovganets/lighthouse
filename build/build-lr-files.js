/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const browserify = require('browserify');
const fs = require('fs');
const path = require('path');
const makeDir = require('make-dir');

const distDir = path.join(__dirname, '..', 'dist', 'lightrider');
const bundleOutFile = `${distDir}/report-generator.js`;
const generatorFilename = `./lighthouse-core/report/report-generator.js`;

makeDir.sync(path.dirname(distDir));

browserify(generatorFilename, {standalone: 'ReportGenerator'})
  // Transform the fs.readFile etc into inline strings.
  .transform('brfs', {global: true, parserOpts: {ecmaVersion: 10}})
  .bundle((err, src) => {
    if (err) throw err;
    fs.writeFileSync(bundleOutFile, src.toString());
  });
