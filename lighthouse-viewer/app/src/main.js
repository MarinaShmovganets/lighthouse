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

/* global window, document */

const ReportGenerator = require('../../../lighthouse-core/report/report-generator');
// const firebase = require('firebase/app');
// require('firebase/auth');

// TODO: load FB via require.
// TODO: use polyfill for URLSearchParams
// TODO: use polyfill for fetch

const LH_CURRENT_VERSION = require('../../../package.json').version;
const APP_URL = `${location.origin}${location.pathname}`;

class Logger {
  constructor(selector) {
    this.el = document.querySelector(selector);
  }

  /**
   * Shows a butter bar.
   * @param {!string} msg The message to show.
   * @param {boolean=} autoHide True to hide the message after a duration.
   *     Default is true.
   */
  log(msg, autoHide = true) {
    clearTimeout(this._id);

    this.el.textContent = msg;
    this.el.classList.add('show');
    if (autoHide) {
      this._id = setTimeout(() => {
        this.el.classList.remove('show');
      }, 7000);
    }
  }

  /**
   * Explicitly hides the butter bar.
   */
  hide() {
    clearTimeout(this._id);
    this.el.classList.remove('show');
  }
}

const logger = new Logger('#log');

class FirebaseAuth {
  constructor() {
    if (!window.firebase) {
      throw new Error('Firebase API not loaded');
    }

    this.accessToken = null;
    this.user = null;

    this.provider = new firebase.auth.GithubAuthProvider();
    this.provider.addScope('gist');

    firebase.initializeApp({
      apiKey: 'AIzaSyApMz8FHTyJNqqUtA51tik5Mro8j-2qMcM',
      authDomain: 'lighthouse-viewer.firebaseapp.com',
      databaseURL: 'https://lighthouse-viewer.firebaseio.com',
      storageBucket: 'lighthouse-viewer.appspot.com',
      messagingSenderId: '962507201498'
    });

    // Wrap auth state callback in a promise so  other parts of the app that
    // require login can hook into the changes.
    this.ready = new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(user => {
        const accessToken = localStorage.getItem('accessToken');
        if (user && accessToken) {
          this.accessToken = accessToken;
          this.user = user;
        }
        resolve(user);
      });
    });
  }

  /**
   * Signs in the user to Github using the Firebase API.
   * @return {!Promise<object>} The logged in user.
   */
  signIn() {
    return firebase.auth().signInWithPopup(this.provider).then(result => {
      this.accessToken = result.credential.accessToken;
      // A limitation of FB auth is that it doesn't return an oauth token
      // after a page refresh. We'll get a firebase token, but not an oauth token
      // for GH. Since GH's tokens never expire, stash the access token in localStorage.
      localStorage.setItem('accessToken', this.accessToken);
      this.user = result.user;
      return this.user;
    });
  }

  /**
   * Signs the user out.
   * @param {!string} msg The message to show.
   * @return {!Promise}
   */
  signOut() {
    return firebase.auth().signOut().then(() => {
      this.accessToken = null;
      localStorage.removeItem('accessToken');
    });
  }
}

class GithubAPI {
  constructor() {
    // this.CLIENT_ID = '48e4c3145c4978268ecb';
    this.auth = new FirebaseAuth();
  }

  static get LH_JSON_FILE() {
    return 'lighthouse_results.json';
  }

  authorize() {
    this.auth.signIn();
  }

  /**
   * Creates a gist under the users account.
   * @param {!string} content The gist file body.
   * @return {!Promise<string>} id of the created gist.
   */
  createGist(content) {
    content = JSON.stringify(content);

    const body = `{
      "description": "lighthouse json results",
      "public": false,
      "files": {
        "${GithubAPI.LH_JSON_FILE}": {
          "content": ${JSON.stringify(content)}
        }
      }
    }`;

    if (!this.auth.user) {
      throw new Error('User not signed in to Github.');
    }

    return fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: new Headers({
        Authorization: `token ${this.auth.accessToken}`
      }),
      body
    })
    .then(resp => resp.json())
    .then(json => json.id);
  }

  /**
   * Fetches the body content of a gist.
   * @param {!string} id The id of a gist.
   * @return {!Promise<object>} json content of the gist.
   */
  getGistContent(id) {
    return this.auth.ready.then(user => {
      const headers = new Headers();

      // If there's an authenticated user, include an Authorization header to
      // have higher rate limits with the Github API. Otherwise, use Etags.
      if (user) {
        headers.set('Authorization', `token ${this.auth.accessToken}`);
      } else {
        const etag = sessionStorage.getItem(id);
        if (etag) {
          headers.set('If-None-Match', etag);
        }
      }

      return fetch(`https://api.github.com/gists/${id}`, {headers}).then(resp => {
        if (!resp.ok) {
          if (resp.status === 304) {
            // TODO: handle 304s.
          }
          throw new Error(`${resp.status} Fetching gist`);
        }

        // const rateLimitRemaining = resp.headers.get('X-RateLimit-Remaining');
        sessionStorage.setItem(id, resp.headers.get('ETag'));

        return resp.json();
      }).then(json => {
        const file = json.files[GithubAPI.LH_JSON_FILE];
        if (!file.truncated) {
          return file.content;
        }
        return fetch(file.raw_url).then(resp => resp.json());
      });
    });
  }

  /**
   * Fetches the user's gists.
   * @param {!string} username
   * @return {!Promise<Array>} List of user;s gists.
   */
  getGists(username) {
    return fetch(`https://api.github.com/users/${username}/gists`, {
      headers: new Headers({
        Authorization: `token ${this.auth.accessToken}`
      })
    })
    .then(resp => resp.json());
  }
}

class FileUploader {
  /**
   * @param {function()} fileHandlerCallback Invoked when the user chooses a new file.
   * @constructor
   */
  constructor(fileHandlerCallback) {
    this.dropZone = document.querySelector('.drop_zone');
    this.placeholder = document.querySelector('.viewer-placeholder');
    this._fileHandlerCallback = fileHandlerCallback;
    this._dragging = false;

    this.addHiddenFileInput();
    this.addListeners();
  }

  addHiddenFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.id = 'hidden-file-input';
    this.fileInput.type = 'file';
    this.fileInput.hidden = true;
    this.fileInput.accept = 'application/json';

    this.fileInput.addEventListener('change', e => {
      this._fileHandlerCallback(e.target.files[0]);
    });

    document.body.appendChild(this.fileInput);
  }

  addListeners() {
    this.placeholder.firstElementChild.addEventListener('click', () => {
      this.fileInput.click();
    });

    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this._resetDraggingUI();
    });

    document.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy'; // Explicitly show as copy action.
    });

    document.addEventListener('dragenter', _ => {
      this.dropZone.classList.add('dropping');
      this._dragging = true;
    });

    document.addEventListener('drop', e => {
      e.stopPropagation();
      e.preventDefault();

      this._resetDraggingUI();

      // Note, this ignores multiple files in the drop, only taking the first.
      this._fileHandlerCallback(e.dataTransfer.files[0]);
    });
  }

  _resetDraggingUI() {
    this.dropZone.classList.remove('dropping');
    this._dragging = false;
    logger.hide();
  }

  removeDropzonePlaceholder() {
    // Remove placeholder drop area after viewing results for first time.
    // General dropzone takes over.
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
  }

  /**
   * Reads a file and returns its content in the specified format.
   * @static
   * @param {!File} file
   * @param {!string} readAs A format to read the file ('text', 'dataurl',
   *     'arraybuffer', 'binstr'). The default is to return the file as text.
   * @return {!Promise<string>}
   */
  static readFile(file, readAs) {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      switch (readAs) {
        case 'arraybuffer':
          reader.readAsArrayBuffer(file);
          break;
        case 'binstr':
          reader.readAsBinaryString(file);
          break;
        case 'dataurl':
          reader.readAsDataURL(file);
          break;
        case 'text':
        default:
          reader.readAsText(file);
      }
    });
  }
}

class LighthouseViewerReport {
  constructor() {
    this.onShare = this.onShare.bind(this);
    this.onFileUpload = this.onFileUpload.bind(this);

    this.json = null;
    this.fileUploader = new FileUploader(this.onFileUpload);
    this.github = new GithubAPI();

    this.addListeners();
    this.loadFromURL();
  }

  addListeners() {
    const printButton = document.querySelector('.js-print');
    if (!printButton) {
      return;
    }

    printButton.addEventListener('click', _ => {
      window.print();
    });

    const button = document.createElement('button');
    button.classList.add('share');
    button.addEventListener('click', this.onShare);
    printButton.parentElement.insertBefore(button, printButton);
  }

  loadFromURL() {
    // Pull gist id from URL and render it.
    const params = new URLSearchParams(location.search);
    const gistId = params.get('gist');
    if (gistId) {
      logger.log('Fetching report from Github...', false);

      this.github.auth.ready.then(_ => {
        this.github.getGistContent(gistId).then(json => {
          logger.hide();
          this.replaceReportHTML(json);
        }).catch(err => logger.log(err));
      });
    }
  }

  _validateReportJson(json) {
    // Leave off patch version in the comparison.
    const semverRe = new RegExp(/^(\d+)?\.(\d+)?\.(\d+)$/);
    const reportVersion = json.lighthouseVersion.replace(semverRe, '$1.$2');
    const lhVersion = LH_CURRENT_VERSION.replace(semverRe, '$1.$2');

    if (!json.lighthouseVersion) {
      throw new Error('JSON file was not generated by Lighthouse');
    } else if (reportVersion < lhVersion) {
      // TODO: figure out how to handler older reports. All permalinks to older
      // reports will start to throw this warning when the viewe rev's its
      // minor LH version.
      // eslint-disable-next-line
      window.alert('WARNING:  Results may not display properly.\n' +
                  'Report was created with an earlier version of ' +
                  `Lighthouse (${json.lighthouseVersion}). The latest ` +
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
    html = div.querySelector('.js-report').outerHTML;

    this.json = json;

    // Remove the placeholder drop area UI once the user has interacted.
    this.fileUploader.removeDropzonePlaceholder();

    // Replace the HTML and hook up event listeners to the new DOM.
    document.querySelector('output').innerHTML = html;
    this.addListeners();
  }

  /**
   * Updates the page's HTML with contents of the JSON file passed in.
   * @param {!File} file
   * @return {!Promise<string>}
   * @throws file was not valid JSON generated by Lighthouse or an unknown file
   *     type of used.
   */
  onFileUpload(file) {
    return FileUploader.readFile(file, 'text').then(str => {
      if (!file.type.match('json')) {
        throw new Error('Unsupported report format. Expected JSON.');
      }
      this.replaceReportHTML(JSON.parse(str));
    }).catch(err => logger.log(err.message));
  }

  /**
   * Shares the current report by creating a gist on Github.
   * @return {!Promise<string>} id of the created gist.
   */
  onShare() {
    // TODO: reuse existing lighthouse_results.json gist if one exists.
    return this.github.createGist(this.json).then(id => {
      history.pushState({}, null, `${APP_URL}?gist=${id}`);
      return id;
    });
  }
}

(function() {
  // eslint-disable-next-line no-new
  new LighthouseViewerReport();
})();
