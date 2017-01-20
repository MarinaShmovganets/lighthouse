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

/* global window, document, location, fetch */

'use strict';

/**
 * @fileoverview Report script for Project Performance Experiment.
 *
 * Include functions for supporting interation between report page and Perf-X server.
 */

window.addEventListener('DOMContentLoaded', () => {
  new ConfigPanel();
});

class ConfigPanel {
  constructor() {
    this._configPanel = document.querySelector('.js-config-panel');
    this._messageField = this._configPanel.querySelector('.js-message');
    this._urlBlockingList = this._configPanel.querySelector('.js-url-blocking-patterns');
    this._urlBlockingStatus = {};

    const bodyToggle = this._configPanel.querySelector('.js-panel-toggle');
    bodyToggle.addEventListener('click', this._toggleBody.bind(this));

    const rerunButton = this._configPanel.querySelector('.js-rerun-button');
    rerunButton.addEventListener('click', this._rerunLighthouse.bind(this));

    // init list view buttons
    const addButton = this._urlBlockingList.querySelector('.js-add-button');
    const patternInput = this._urlBlockingList.querySelector('.js-pattern-input');
    addButton.addEventListener('click', () => {
      if (patternInput.value) {
        this.addBlockedUrlPattern(patternInput.value);
        this._urlBlockingList.parentNode.scrollTop = this._urlBlockingList.offsetHeight;
        patternInput.value = '';
      }
    });
    patternInput.addEventListener('keypress', event => {
      (event.keyCode || event.which) === 13 && addButton.click();
    });

    // init tree view buttons
    const requestBlockToggles = this._configPanel.querySelectorAll('.js-request-blocking-toggle');
    requestBlockToggles.forEach(toggle => {
      const requestNode = toggle.parentNode;
      const url = requestNode.getAttribute('title');

      toggle.addEventListener('click', () => {
        if (requestNode.classList.contains('request__block')) {
          this.removeBlockedUrlPattern(url);
        } else {
          this.addBlockedUrlPattern(url);
        }
      });
    });

    // get and recover blocked URL patterns of current run
    fetch('/blocked-url-patterns').then(response => {
      return response.text();
    }).then(data => {
      const blockedUrlPatterns = JSON.parse(data);
      blockedUrlPatterns.forEach(urlPattern => this.addBlockedUrlPattern(urlPattern));
      this.log('');
    });
  }

  /**
   * Send POST request to rerun lighthouse with additional flags.
   */
  _rerunLighthouse() {
    this.log('Start Rerunning Lighthouse');

    const options = {
      blockedUrlPatterns: this.getBlockedUrlPatterns()
    };

    return fetch('/rerun', {method: 'POST', body: JSON.stringify(options)}).then(() => {
      location.reload();
    }).catch(err => {
      this.log(`Lighthouse Runtime Error: ${err}`);
    });
  }

  addBlockedUrlPattern(urlPattern) {
    if (this._urlBlockingStatus[urlPattern]) {
      this.log(`${urlPattern} is already in the list`);
      return;
    }

    const template = this._configPanel.querySelector('template.url-blocking-entry');
    const templateCopy = document.importNode(template.content, true);
    const newEntry = templateCopy.querySelector('.url-blocking-entry');

    // create and add a new entry in the list view
    newEntry.querySelector('div').textContent = urlPattern;
    newEntry.setAttribute('data-url-pattern', urlPattern);
    this._urlBlockingList.insertBefore(newEntry, template);
    newEntry.querySelector('button').addEventListener('click', () => {
      this.removeBlockedUrlPattern(urlPattern);
    });

    // update block status in cnc-tree if the url matches perfectly
    const treeNode = this._configPanel.querySelector(`.js-cnc-node[title='${urlPattern}']`);
    treeNode && treeNode.classList.add('request__block');

    this._urlBlockingStatus[urlPattern] = true;
    this.log(`Added URL Blocking Pattern: ${urlPattern}`);
  }

  removeBlockedUrlPattern(urlPattern) {
    if (!this._urlBlockingStatus[urlPattern]) {
      this.log(`${urlPattern} is not in the list`);
      return;
    }

    // remove the entry in list view
    const entrySelector = `.url-blocking-entry[data-url-pattern='${urlPattern}']`;
    const urlEntry = this._configPanel.querySelector(entrySelector);
    urlEntry && urlEntry.parentNode.removeChild(urlEntry);

    // update block status in cnc-tree if the url matches perfectly
    const treeNodeSelector = `.js-cnc-node[title='${urlPattern}']`;
    const treeNode = this._configPanel.querySelector(treeNodeSelector);
    treeNode && treeNode.classList.remove('request__block');

    this._urlBlockingStatus[urlPattern] = false;
    this.log(`Removed URL Blocking Pattern: ${urlPattern}`);
  }

  getBlockedUrlPatterns() {
    return Object.keys(this._urlBlockingStatus).filter(key => this._urlBlockingStatus[key]);
  }

  log(message) {
    this._messageField.innerHTML = message;
  }

  _toggleBody() {
    this._configPanel.classList.toggle('expanded');
  }
}
