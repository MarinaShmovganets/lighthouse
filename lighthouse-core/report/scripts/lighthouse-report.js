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

/* global ga */

'use strict';

const logger = require('./logger');

class LighthouseReport {

  /**
   * @param {Object=} lhresults Lighthouse JSON results.
   */
  constructor(lhresults) {
    this.onCopy = this.onCopy.bind(this);
    this.onCopyButtonClick = this.onCopyButtonClick.bind(this);

    this._copyAttempt = false;

    this.json = lhresults || null;

    this._addEventListeners();
  }

  _addEventListeners() {
    const printButton = document.querySelector('.js-print');
    if (printButton) {
      printButton.addEventListener('click', _ => {
        window.print();
      });
    }

    const copyButton = document.querySelector('.js-copy');
    if (copyButton) {
      copyButton.addEventListener('click', this.onCopyButtonClick);
      document.addEventListener('copy', this.onCopy);
    }
  }

  /**
   * Handler copy events.
   */
  onCopy(e) {
    // Only handle copy button presses (e.g. ignore the user copying page text).
    if (this._copyAttempt) {
      // We want to write our own data to the clipboard, not the user's text selection.
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(this.json, null, 2));
      logger.log('Report copied to clipboard');
    }

    this._copyAttempt = false;
  }

  /**
   * Copies the report JSON to the clipboard (if supported by the browser).
   */
  onCopyButtonClick() {
    window.ga && ga('send', 'event', 'report', 'copy');

    try {
      if (document.queryCommandSupported('copy')) {
        this._copyAttempt = true;

        // Note: In Safari 10.0.1, execCommand('copy') returns true if there's
        // a valid text selection on the page. See http://caniuse.com/#feat=clipboard.
        const successful = document.execCommand('copy');
        if (!successful) {
          this._copyAttempt = false; // Prevent event handler from seeing this as a copy attempt.
          logger.warn('Your browser does not support copy to clipboard.');
        }
      }
    } catch (err) {
      this._copyAttempt = false;
      logger.log(err.message);
    }
  }
}

module.exports = LighthouseReport;
