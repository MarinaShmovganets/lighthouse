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

const Audit = require('../audit');

class NoPlugins extends Audit {
  /**
   * @override
   */
  static get tags() {
    return ['UX'];
  }

  /**
   * @override
   */
  static get name() {
    return 'no-plugins';
  }

  /**
   * @override
   */
  static get description() {
    return 'Does not use any plugins';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    // Early exit if there are any iframes that aren't sandboxed.
    if (!artifacts.sandboxedIframes) {
      return NoPlugins.generateAuditResult(false);
    }

    // Same if there are no network records.
    if (!artifacts.networkRecords) {
      return NoPlugins.generateAuditResult(false);
    }

    // If there are sandboxed iframes, and there are no objects in the page, this should mean
    // the page is good and we can early exit with success.
    if (artifacts.sandboxedIframes && artifacts.hasNoObjects) {
      return NoPlugins.generateAuditResult(true);
    }

    const noObject = /object-src\s+'none'/gim;

    // Get the network requests and get the one that matches the tested URL.
    const pageNetworkRequests =
        artifacts.networkRecords.filter(record => record.data._url === artifacts.url);

    if (pageNetworkRequests.length === 0) {
      return NoPlugins.generateAuditResult(false);
    }

    const pageNetworkRequest = pageNetworkRequests[0];
    const responseHeaders = pageNetworkRequest.data._responseHeaders;

    // Filter the request headers for CSP.
    const CSPHeaders =
        responseHeaders.filter(header => (header.name === 'Content-Security-Policy'));

    if (CSPHeaders.length === 0) {
      return NoPlugins.generateAuditResult(false);
    }

    const CSP = CSPHeaders[0];

    return NoPlugins.generateAuditResult(noObject.test(CSP.value));
  }
}

module.exports = NoPlugins;
