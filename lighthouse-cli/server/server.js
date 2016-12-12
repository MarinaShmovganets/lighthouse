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

const http = require('http');
const fs = require('fs');
const parse = require('url').parse;

// use a {filename: actualPath} mapping to restrict access to other files and simplify URL
const filePathDict = {'./favicon.ico': `${__dirname}/images/favicon.ico`};
let portPromise;

function requestHandler(request, response) {
  const parsedURL = parse(request.url, true);
  const filename = `.${parsedURL.pathname}`;
  const filePath = filePathDict[filename] || '';

  fs.exists(filePath, fsExistsCallback);

  function fsExistsCallback(fileExists) {
    if (!fileExists) {
      return sendResponse(404, `404 - File not found. ${filename}`);
    }
    fs.readFile(filePath, 'binary', readFileCallback);
  }

  function readFileCallback(err, file) {
    if (err) {
      console.error(`Unable to read local file ${absoluteFilePath}:`, err);
      return sendResponse(500, '500 - Internal Server Error');
    }
    sendResponse(200, file);
  }

  function sendResponse(statusCode, data) {
    let headers;
    if (filePath) {
      if (filePath.endsWith('.html')) {
        headers = {'Content-Type': 'text/html'};
      } else if (filePath.endsWith('.json')) {
        headers = {'Content-Type': 'text/json'};
      } else if (filePath.endsWith('.png')) {
        headers = {'Content-Type': 'image/x-icon'};
      }
    }
    response.writeHead(statusCode, headers);
    finishResponse(data);
  }

  function finishResponse(data) {
    response.write(data, 'binary');
    response.end();
  }
}

function getPort(port) {
  if (!portPromise) {
    portPromise = new Promise((reslove, reject) => {
      server.listen(port, _ => reslove(server.address().port));
    });
  }
  return portPromise;
}

function addFile(filename, filePath) {
  filePathDict[filename] = filePath;
  console.log(filePathDict[filename]);
}

const server = http.createServer(requestHandler);

server.on('error', e => console.error(e.code, e));

module.exports = {
  filePathDict: filePathDict,
  getPort: getPort
};
