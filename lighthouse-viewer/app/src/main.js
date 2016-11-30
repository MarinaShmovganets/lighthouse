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
// const Handlebars = require('handlebars');
// require('../../../lighthouse-core/report/scripts/lighthouse-report.js');

function updateHTML(lhresults) {
  const reportGenerator = new ReportGenerator();
  let html;
  try {
    html = reportGenerator.generateHTML(lhresults, 'viewer');
  } catch (err) {
    html = reportGenerator.renderException(err, lhresults);
  }

  const div = document.createElement('div');
  div.innerHTML = html;
  html = div.querySelector('.js-report').outerHTML;

  document.querySelector('output').innerHTML = html;

  // eslint-disable-next-line no-new
  new window.LighthouseReport();
}

class DragAndDropFile {
  constructor(selector) {
    this.dropZone = document.querySelector(selector);
    this._dragging = false;

    this.addEventListeners();
  }

  addEventListeners() {
    // The mouseleave event is more reliable than dragleave when the user drops
    // the file outside the window.
    document.addEventListener('mouseleave', _ => {
      if (!this._dragging) {
        return;
      }
      this.dropZone.classList.remove('dropping');
      this._dragging = false;
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

      this.dropZone.classList.remove('dropping');
      this._dragging = false;

      const placeholder = document.querySelector('.viewer-placeholder');
      if (placeholder) {
        placeholder.remove();
      }

      const file = e.dataTransfer.files[0]; // Take first file dropped.

      // Only process certain files.
      if (file.type.match('json')) {
        this.readFile(file).then(jsonStr => {
          try {
            const json = JSON.parse(jsonStr);
            if (!json.lighthouseVersion) {
              throw new Error('JSON file is not a Lighthouse run');
            }

            updateHTML(json);
          } catch (e) {
            console.error(e);
          }
        });
      } else {
        // eslint-disable-next-line
        window.alert('Unsupported report type');
      }
    });
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

window.addEventListener('DOMContentLoaded', _ => {
  // eslint-disable-next-line no-new
  new DragAndDropFile('.drop_zone');
});
