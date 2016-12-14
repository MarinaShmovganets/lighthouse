/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* global ga */

const FileUploader = require('./fileuploader');
const GithubAPI = require('./github');
const idb = require('idb-keyval');
const logger = require('./logger');
const ReportGenerator = require('../../../lighthouse-core/report/report-generator');

const LH_CURRENT_VERSION = require('../../../package.json').version;
const APP_URL = `${location.origin}${location.pathname}`;

/**
 * Class to handle dynamic changes to the page when users view new reports.
 * @class
 */
class LighthouseViewerReport {

  constructor() {
    this.onShare = this.onShare.bind(this);
    this.onCopy = this.onCopy.bind(this);
    this.onCopyButtonClick = this.onCopyButtonClick.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);
    this.onPaste = this.onPaste.bind(this);

    this._copyAttempt = false;

    this.json = null;
    this.fileUploader = new FileUploader(this.onFileUpload);
    this.github = new GithubAPI();

    this._isNewReport = true;

    this.initUI();
    this.loadFromURL();
  }

  initUI() {
    const printButton = document.querySelector('.js-print');
    if (printButton) {
      printButton.addEventListener('click', _ => {
        window.print();
      });
    }

    this.shareButton = document.querySelector('.js-share');
    if (this.shareButton) {
      this.shareButton.addEventListener('click', this.onShare);

      // Disable the share button after the user shares the gist or if we're loading
      // a gist from Github. In both cases, the gist is already shared :)
      if (this._isNewReport) {
        this.enableShareButton();
      } else {
        this.disableShareButton();
      }
    }

    const copyButton = document.querySelector('.js-copy');
    if (copyButton) {
      copyButton.addEventListener('click', this.onCopyButtonClick);
      document.addEventListener('copy', this.onCopy);
    }

    document.addEventListener('paste', this.onPaste);
  }

  enableShareButton() {
    this.shareButton.classList.remove('disable');
    this.shareButton.disabled = false;
  }

  disableShareButton() {
    this.shareButton.classList.add('disable');
    this.shareButton.disabled = true;
  }

  loadFromURL() {
    // Pull gist id from URL and render it.
    const params = new URLSearchParams(location.search);
    const gistId = params.get('gist');
    if (gistId) {
      logger.log('Fetching report from Github...', false);

      this.github.auth.ready.then(_ => {
        this.github.getGistFileContentAsJson(gistId).then(json => {
          logger.hide();

          this._isNewReport = false;
          this.replaceReportHTML(json.content);

          // Save fetched json and etag to IDB so we can use it later for 304
          // requests. This is done after replaceReportHTML, so we don't save
          // unrecognized JSON to IDB. replaceReportHTML will throw in that case.
          return idb.set(gistId, {etag: json.etag, content: json.content});
        }).catch(err => logger.error(err.message));
      });
    }
  }

  _validateReportJson(reportJson) {
    if (!reportJson.lighthouseVersion) {
      throw new Error('JSON file was not generated by Lighthouse');
    }

    // Leave off patch version in the comparison.
    const semverRe = new RegExp(/^(\d+)?\.(\d+)?\.(\d+)$/);
    const reportVersion = reportJson.lighthouseVersion.replace(semverRe, '$1.$2');
    const lhVersion = LH_CURRENT_VERSION.replace(semverRe, '$1.$2');

    if (reportVersion < lhVersion) {
      // TODO: figure out how to handler older reports. All permalinks to older
      // reports will start to throw this warning when the viewer rev's its
      // minor LH version.
      // See https://github.com/GoogleChrome/lighthouse/issues/1108
      logger.warn('Results may not display properly.\n' +
                  'Report was created with an earlier version of ' +
                  `Lighthouse (${reportJson.lighthouseVersion}). The latest ` +
                  `version is ${LH_CURRENT_VERSION}.`);
    }
  }

  replaceReportHTML(json) {
    this._validateReportJson(json);

    const reportGenerator = new ReportGenerator();

    let html;
    try {
      html = reportGenerator.generateHTML(json, 'viewer');
    } catch (err) {
      html = reportGenerator.renderException(err, json);
    }

    // Use only the results section of the full HTML page.
    const div = document.createElement('div');
    div.innerHTML = html;

    document.title = div.querySelector('title').textContent;

    html = div.querySelector('.js-report').outerHTML;

    this.json = json;

    // Remove the placeholder drop area UI once the user has interacted.
    this.fileUploader.removeDropzonePlaceholder();

    // Replace the HTML and hook up event listeners to the new DOM.
    document.querySelector('output').innerHTML = html;
    this.initUI();

    ga('send', 'event', 'report', 'view');
  }

  /**
   * Updates the page's HTML with contents of the JSON file passed in.
   * @param {!File} file
   * @return {!Promise<string>}
   * @throws file was not valid JSON generated by Lighthouse or an unknown file
   *     type of used.
   */
  onFileUpload(file) {
    return FileUploader.readFile(file).then(str => {
      if (!file.type.match('json')) {
        throw new Error('Unsupported report format. Expected JSON.');
      }
      this._isNewReport = true;

      this.replaceReportHTML(JSON.parse(str));
    }).catch(err => logger.error(err.message));
  }

  /**
   * Shares the current report by creating a gist on Github.
   * @return {!Promise<string>} id of the created gist.
   */
  onShare() {
    ga('send', 'event', 'report', 'share');

    // TODO: find and reuse existing json gist if one exists.
    return this.github.createGist(this.json).then(id => {
      ga('send', 'event', 'report', 'created');

      this.disableShareButton();
      history.pushState({}, null, `${APP_URL}?gist=${id}`);

      return id;
    }).catch(err => logger.log(err.message));
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
    ga('send', 'event', 'report', 'copy');

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

  /**
   * Enables pasting a JSON report on the page.
   */
  onPaste(e) {
    e.preventDefault();

    try {
      const json = JSON.parse(e.clipboardData.getData('text'));
      this.replaceReportHTML(json);

      ga('send', 'event', 'report', 'paste');
    } catch (err) {
      // noop
    }
  }
}

module.exports = LighthouseViewerReport;
