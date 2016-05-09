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

class Formatter {
  static get FORMATS() {
    if (!this._formatters) {
      this._processFormatters();
    }

    if (!this._formats) {
      this._processFormats();
    }

    return this._formats;
  }

  static _processFormatters() {
    this._formatters = {
      accessibility: require('./accessibility')
    };
  }

  static _processFormats() {
    const formatNames = Object.keys(this._formatters);
    this._formats = {};
    formatNames.forEach(format => {
      this._formats[format.toUpperCase()] = format;
    });
  }

  static getByName(name) {
    if (!this._formatters) {
      this._processFormatters();
    }

    if (!this._formatters[name]) {
      throw new Error(`Unknown formatter: ${name}`);
    }

    return this._formatters[name];
  }

  static getPrettyFormatter() {
    throw new Error('Formatter must implement getPrettyFormatter()');
  }

  static getHTMLFormatter() {
    throw new Error('Formatter must implement getHTMLFormatter()');
  }
}

module.exports = Formatter;
