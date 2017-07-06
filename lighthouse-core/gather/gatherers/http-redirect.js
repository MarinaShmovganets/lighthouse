/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const URL = require('../../lib/url-shim');

/**
 * This gatherer changes the options.url so that its pass loads the http page.
 * After load it detects if its protocol is https
 * TODO: Instead of abusing a loadPage pass for this test, it could likely just do an XHR instead
 */
class HTTPRedirect extends Gatherer {

  constructor() {
    super();
    this._preRedirectURL = undefined;
  }

  beforePass(options) {
    this._preRedirectURL = options.url;
    options.url = this._preRedirectURL.replace(/^https/, 'http');
  }

  afterPass(options) {
    let isRedirect = new URL(options.url).protocol === 'https:' ? true : false;

    if(options.driver._httpsArr.length !== 0) {
      options.driver._httpsArr.forEach( (httpsUrl) => {
        if(new URL(options.url).protocol === 'http:') {
          const RedirectURL = options.url.replace(/^http/, 'https');
          if(RedirectURL === httpsUrl.url) {
            isRedirect = true;
          }
        } else if(httpsUrl.url === options.url) {
          isRedirect = true;
        } else if(httpsUrl.path === '/') {
          isRedirect = true;
        }
      });
    }
    options.url = this._preRedirectURL;
    return {value: isRedirect};
  }
}

module.exports = HTTPRedirect;
