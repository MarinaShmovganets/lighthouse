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

const fs = require('fs');
const Report = require('../report/browser/report');

class Printer {

  /**
   * @constructor
   */
  constructor() {
    this._outputMode = 'pretty';
    this._outputPath = 'stdout';
  }

  /**
   * An enumeration of acceptable output modes:
   * <ul>
   *   <li>'pretty': Pretty print the results</li>
   *   <li>'json': JSON formatted results</li>
   *   <li>'html': An HTML report</li>
   * </ul>
   *
   * @return results
   */
  static get _outputModes() {
    return [
      'pretty',
      'json',
      'html'
    ];
  }

  /**
   * @return {string} The current output mode.
   */
  get outputMode() {
    return this._outputMode;
  }

  /**
   * The output mode to use.
   *
   * @see Printer._outputModes;
   * @param {string} mode
   */
  set outputMode(mode) {
    if (Printer._outputModes.indexOf(mode) === -1) {
      console.warn(`Unknown output mode ${mode}; using pretty`);
      this._outputMode = 'pretty';
      return;
    }

    this._outputMode = mode;
  }

  /**
   * @return {string} The current output path.
   */
  get outputPath() {
    return this._outputPath;
  }

  /**
   * The output path to use, either stdout or a file path.
   * @param {string} path
   */
  set outputPath(path) {
    if (!path) {
      console.warn('No output path set; using stdout');
      this._outputPath = 'stdout';
      return;
    }

    this._outputPath = path;
  }

  /**
   * Writes the results.
   *
   * @param {{url: string, aggregations: !Array<*>}} results
   * @return {Promise}
   */
  write(results) {
    return this.createOutput(results).then(output => {
      if (this._outputPath === 'stdout') {
        return this.writeToStdout(output);
      }

      return this.writeFile(this._outputPath, output);
    });
  }

  /**
   * Creates the output based on the mode.
   *
   * @param {{url: string, aggregations: !Array<*>}} results
   * @return {Promise}
   */
  createOutput(results) {
    const report = new Report();

    // HTML report.
    if (this._outputMode === 'html') {
      return report.generateHTML(results);
    }

    // JSON report.
    if (this._outputMode === 'json') {
      return Promise.resolve(JSON.stringify(results.aggregations, null, 2));
    }

    // Pretty printed.
    let output = '';
    results.aggregations.forEach(item => {
      let score = (item.score.overall * 100).toFixed(0);
      output += `${item.name}: ${score}%\n`;

      item.score.subItems.forEach(subitem => {
        let lineItem = ` -- ${subitem.description}: ${subitem.value}`;
        if (subitem.rawValue) {
          lineItem += ` (${subitem.rawValue})`;
        }
        output += `${lineItem}\n`;
        if (subitem.debugString) {
          output += `    ${subitem.debugString}\n`;
        }
      });

      output += '\n';
    });

    return Promise.resolve(output);
  }

  /**
   * Writes the output to stdout.
   *
   * @param {string} output
   */
  writeToStdout(output) {
    console.log(output);
  }

  /**
   * Writes the output to a file.
   *
   * @param  {string} filePath The destination path
   * @param  {string} output The output to write
   * @return {Promise}
   */
  writeFile(filePath, output) {
    return new Promise((resolve, reject) => {
      // TODO: make this mkdir to the filePath.
      fs.writeFile(filePath, output, 'utf8', err => {
        if (err) {
          return reject(err);
        }

        resolve(`Output written to ${filePath}`);
      });
    });
  }
}

module.exports = Printer;
