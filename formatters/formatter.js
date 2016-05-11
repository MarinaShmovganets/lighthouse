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
  static get SUPPORTED_FORMATS() {
    // Get the available formatters if they don't already exist.
    if (!this._formatters) {
      this._getFormatters();
    }

    // From the formatters we can establish a master list of supported format names.
    if (!this._supportedFormatsNames) {
      this._generateSupportedFormats();
    }

    return this._supportedFormatsNames;
  }

  static _getFormatters() {
    this._formatters = {
      accessibility: require('./accessibility'),
      criticalNetworkChains: require('./critical-network-chains')
    };
  }

  static _generateSupportedFormats() {
    const formatNames = Object.keys(this._formatters);
    this._supportedFormatsNames = formatNames.reduce((prev, format) => {
      const formatName = format.replace(/([A-Z])/g, '_$1').toUpperCase();
      prev[formatName] = format;
      return prev;
    }, {});
  }

  static getByName(name) {
    if (!this._formatters) {
      this._getFormatters();
    }

    if (!this._formatters[name]) {
      throw new Error(`Unknown formatter: ${name}`);
    }

    return this._formatters[name];
  }

  static getFormatter() {
    throw new Error('Formatter must implement getPrettyFormatter()');
  }
}

module.exports = Formatter;
