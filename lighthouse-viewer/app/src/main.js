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

const LH_CURRENT_VERSION = require('../../../package.json').version;
const APP_URL = `${location.origin}${location.pathname}`;

class Logger {
  constructor(selector) {
    this.el = document.querySelector(selector);
  }

  log(msg) {
    clearTimeout(this._id);

    this.el.textContent = msg;
    this.el.classList.add('show');
    this._id = setTimeout(() => {
      this.el.classList.remove('show');
    }, 7000);
  }

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

    this.ready = new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(user => {
        const accessToken = localStorage.getItem('accessToken');
        if (user && accessToken) {
          this.accessToken = accessToken;
          this.user = user;
        }
        resolve();
      });
    });
  }

  signIn() {
    return firebase.auth().signInWithPopup(this.provider).then(result => {
      this.accessToken = result.credential.accessToken;
      // GH access tokens never expire so we can continue to use this on page refresh.
      localStorage.setItem('accessToken', this.accessToken);
      this.user = result.user;
    });
  }

  signOut() {
    return firebase.auth().signOut().then(() => {
      this.accessToken = null;
      localStorage.removeItem('accessToken');
    });
  }
}

class GithubAPI {
  constructor() {
    this.CLIENT_ID = '48e4c3145c4978268ecb';
    this.CLIENT_SECRET = '460e73e4a949ed6e2abdd12c705bfb56728e9604';
    this.auth = new FirebaseAuth();
  }

  static get LH_JSON_FILE() {
    return 'lighthouse_results.json';
  }

  authorize() {
    this.auth.signIn();
  }

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

  getGistContent(id) {
    return fetch(`https://api.github.com/gists/${id}`, {
      headers: new Headers({
        Authorization: `token ${this.auth.accessToken}`
      })
    })
    .then(resp => {
      if (!resp.ok) {
        throw new Error(`${resp.status} Fetching gist`);
      }
      return resp.json();
    })
    .then(json => {
      const file = json.files[GithubAPI.LH_JSON_FILE];
      if (!file.truncated) {
        return file.content;
      }
      return fetch(file.raw_url).then(resp => resp.json());
    });
  }

  // getGists(username) {
  //   fetch(`https://api.github.com/users/${username}/gists`, {
  //     headers: new Headers({
  //       Authorization: `token ${this.auth.accessToken}`
  //     })
  //   })
  //   .then(resp => resp.json())
  //   .then(json => {
  //     json.forEach(i => {
  //       console.log(i.description);
  //     });
  //   });
  // }
}

const github = new GithubAPI();
window.github = github;

class FileUploader {
  constructor() {
    this.dropZone = document.querySelector('.drop_zone');
    this.placeholder = document.querySelector('.viewer-placeholder');
    this._dragging = false;

    this.attachHiddenFileInput();
    this.addDnDEventListeners();
  }

  attachHiddenFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.id = 'hidden-file-input';
    this.fileInput.type = 'file';
    this.fileInput.hidden = true;
    this.fileInput.accept = 'application/json';

    this.fileInput.addEventListener('change', e => {
      this.updatePage(e.target.files[0]).catch(err => logger.log(err.message));
    });

    document.body.appendChild(this.fileInput);
  }

  addDnDEventListeners() {
    this.placeholder.firstElementChild.addEventListener('click', () => {
      this.fileInput.click();
    });

    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this.resetDraggingUI();
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

      this.resetDraggingUI();

      // Ignore other files if more than one is dropped.
      this.updatePage(e.dataTransfer.files[0])
          // TODO: reuse existing lighthouse_results.json gist if one exists.
          // TODO: reactor github global var pollution.
          .then(json => github.createGist(json))
          .then(id => {
            history.pushState({}, null, `${APP_URL}?gist=${id}`);
          }).catch(err => logger.log(err.message));
    });
  }

  resetDraggingUI() {
    this.dropZone.classList.remove('dropping');
    this._dragging = false;
  }

  /**
   * Reads a file as text.
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

  /**
   * Updates the page's HTML with contents of the JSON file passed in.
   * @param {!File} file
   * @return {!Promise<string>}
   * @throws file was not valid JSON generated by Lighthouse or an unknown file
   *     type of used.
   */
  updatePage(file) {
    return FileUploader.readFile(file, 'text').then(str => {
      if (!file.type.match('json')) {
        throw new Error('Unsupported report type. Expected JSON.');
      }

      const json = JSON.parse(str);
      replaceHTML(json);

      // Remove placeholder drop area after viewing results for first time.
      // General dropzone takes over.
      if (this.placeholder) {
        this.placeholder.remove();
        this.placeholder = null;
      }

      return json;
    });
  }
}

function replaceHTML(lhresults) {
  if (!lhresults.lighthouseVersion) {
    throw new Error('JSON file was not generated by Lighthouse');
  } else if (lhresults.lighthouseVersion < LH_CURRENT_VERSION) {
    // eslint-disable-next-line
    window.alert('WARNING:  Results may not display properly.\n' +
                'Report was created with an earlier version of ' +
                  `Lighthouse (${lhresults.lighthouseVersion}). The latest ` +
                  `version is ${LH_CURRENT_VERSION}.`);
  }

  const reportGenerator = new ReportGenerator();
  let html;
  try {
    html = reportGenerator.generateHTML(lhresults, 'viewer');
  } catch (err) {
    html = reportGenerator.renderException(err, lhresults);
  }

  // Pull out the report part of the generated HTML.
  const div = document.createElement('div');
  div.innerHTML = html;
  html = div.querySelector('.js-report').outerHTML;

  document.querySelector('output').innerHTML = html;

  // eslint-disable-next-line no-new
  new window.LighthouseReport(); // activate event listeners on new results page.
}

function init() {
  // eslint-disable-next-line no-new
  new FileUploader();

  // Pull gist id from URL and render it.
  const params = new URLSearchParams(location.search);
  const gistId = params.get('gist');
  if (gistId) {
    logger.log('Loading results from gist...');

    github.auth.ready.then(() => {
      github.getGistContent(gistId).then(json => {
        logger.hide();
        replaceHTML(json);
      }).catch(err => logger.log(err));
    });
  }
}

init();
