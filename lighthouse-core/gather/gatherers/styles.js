/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers the active style and stylesheets used on a page.
 * "Active" means that if the stylesheet is removed at a later time
 * (before endStylesCollect is called), this gatherer will not include it.
 */

'use strict';

const Gatherer = require('./gatherer');

class Styles extends Gatherer {
  constructor() {
    super();
    this._activeStyleSheetIds = [];
    this._activeStyleHeaders = {};
    this._onStyleSheetAdded = this.onStyleSheetAdded.bind(this);
    this._onStyleSheetRemoved = this.onStyleSheetRemoved.bind(this);
  }

  onStyleSheetAdded(styleHeader) {
    // Exclude stylesheets "injected" by extensions or ones that were added by
    // users using the "inspector".
    if (styleHeader.header.origin !== 'regular') {
      return;
    }

    this._activeStyleHeaders[styleHeader.header.styleSheetId] = styleHeader;
    this._activeStyleSheetIds.push(styleHeader.header.styleSheetId);
  }

  onStyleSheetRemoved(styleHeader) {
    delete this._activeStyleHeaders[styleHeader.styleSheetId];

    const idx = this._activeStyleSheetIds.indexOf(styleHeader.styleSheetId);
    if (idx !== -1) {
      this._activeStyleSheetIds.splice(idx, 1);
    }
  }

  beginStylesCollect(driver) {
    driver.on('CSS.styleSheetAdded', this._onStyleSheetAdded);
    driver.on('CSS.styleSheetRemoved', this._onStyleSheetRemoved);
    return driver.sendCommand('DOM.enable').then(_ => driver.sendCommand('CSS.enable'));
  }

  endStylesCollect(driver) {
    return new Promise((resolve, reject) => {
      if (!this._activeStyleSheetIds.length) {
        resolve([]);
        return;
      }

      // Get text content of each style.
      const contentPromises = this._activeStyleSheetIds.map(sheetId => {
        return driver
          .sendCommand('CSS.getStyleSheetText', {
            styleSheetId: sheetId,
          })
          .then(content => {
            const styleHeader = this._activeStyleHeaders[sheetId];
            styleHeader.content = content.text;
            return styleHeader;
          });
      });

      Promise.all(contentPromises)
        .then(styleHeaders => {
          driver.off('CSS.styleSheetAdded', this._onStyleSheetAdded);
          driver.off('CSS.styleSheetRemoved', this._onStyleSheetRemoved);

          return driver
            .sendCommand('CSS.disable')
            .then(_ => driver.sendCommand('DOM.disable'))
            .then(_ => resolve(styleHeaders));
        })
        .catch(err => reject(err));
    });
  }

  afterPass(options) {
    return this.beginStylesCollect(options.driver)
      .then(() => this.endStylesCollect(options.driver))
      .then(stylesheets => {
        // Generally want unique stylesheets. Mark those with the same text content.
        // An example where stylesheets are the same is if the user includes a
        // stylesheet more than once (these have unique stylesheet ids according to
        // the DevTools protocol). Another example is many instances of a shadow
        // root that share the same <style> tag.
        const uniqueByContent = Array.from(
          new Map(stylesheets.map(s => [s.content + s.header.sourceURL, s])).values()
        );
        return new Map(uniqueByContent.map(sheet => [sheet.header.styleSheetId, sheet]));
      });
  }
}

module.exports = Styles;
