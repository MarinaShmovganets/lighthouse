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

const Gather = require('./gather');
const manifestParser = require('../helpers/manifest-parser');

const MANIFEST_LOAD_TIMEOUT = 10000;

class ManifestGather extends Gather {
  constructor() {
    super();

    this._validManifestRequestPromise = null;
    this._manifestListener = null;
  }

  _errorManifest(errorString) {
    return {
      manifest: {
        raw: undefined,
        value: undefined,
        debugString: errorString
      }
    };
  }

  _isManifestRequest(request) {
    const resourceType = request.resourceType();
    return resourceType && resourceType.name() === 'manifest';
  }

  _isValidRequest(request) {
    return request.statusCode === 200;
  }

  /**
   * Sets up a network request listener to check if a manifest is received.
   */
  setup(options) {
    const driver = options.driver;
    const networkRecorder = driver.getNetworkRecorder();

    // A promise that resolves as soon as the network recorder receives a manifest.
    this._validManifestRequestPromise = new Promise((resolve, reject) => {
      this._manifestListener = request => {
        if (this._isManifestRequest(request) && this._isValidRequest(request)) {
          resolve();
        }
      };

      networkRecorder.on('RequestFinished', this._manifestListener);
    });
  }

  /**
   * If a manifest has not been received yet, forces Chrome to request one,
   * stopping when either a manifest is received or a time limit is reached.
   */
  afterPageLoad(options) {
    const driver = options.driver;
    const networkRecorder = driver.getNetworkRecorder();

    // First check the DOM to skip all effort if there's no manifest.
    return driver.querySelector('head link[rel="manifest"]')
      .then(node => {
        if (!node) {
          this.artifact = this._errorManifest('No <link rel="manifest"> found in DOM.');
          networkRecorder.removeListener('RequestFinished', this._manifestListener);
          return;
        }

        // Add a timeout to the active manifest listener.
        let timeoutId;
        const manifestOrBust = Promise.race([
          this._validManifestRequestPromise,
          new Promise((resolve, reject) => {
            timeoutId = setTimeout(resolve, MANIFEST_LOAD_TIMEOUT);
          })
        ]).then(_ => {
          // Clean up.
          networkRecorder.removeListener('RequestFinished', this._manifestListener);
          this.manifestListener = null;
          clearTimeout(timeoutId);
        });

        // Trigger a fetch of the manifest by Chrome and wait on response/timeout.
        return driver.sendCommand('Page.requestAppBanner')
          .then(_ => manifestOrBust);
      });
  }

  /**
   * Sifts through network record to find manifest. If a valid one is found,
   * parses it and returns the result. If not, an appropriate error is returned.
   */
  afterTraceCollected(options, tracingData) {
    if (this.artifact.manifest) {
      // Already gathered.
      return;
    }

    const networkRecords = tracingData.networkRecords;
    const manifestRequests = networkRecords.filter(this._isManifestRequest);

    if (manifestRequests.length === 0) {
      this.artifact = this._errorManifest('Timed out waiting for manifest to load.');
      return;
    }

    // Get valid manifest out of network records.
    const validManifestRequest = manifestRequests.find(this._isValidRequest);

    // If no valid request, choose the last erroneous manifest and report on it.
    if (!validManifestRequest) {
      const lastManifestRequest = manifestRequests[manifestRequests.length - 1];
      const reason = `${lastManifestRequest.statusCode}: ${lastManifestRequest.statusText}`;
      this.artifact = this._errorManifest(
          `Unable to fetch manifest at '${lastManifestRequest.url}' (${reason}).`);
      return;
    }

    // On successful request, grab the manifest request body for parsing.
    return options.driver.sendCommand('Network.getResponseBody', {
      requestId: validManifestRequest.requestId
    })
      .then(response => {
        this.artifact = {
          manifest: manifestParser(response.body)
        };
        return;
      }, _ => {
        // TODO: should be a fault.
        this.artifact = this._errorManifest('Manifest fetched but unable to retrieve request ' +
          `body for '${validManifestRequest.url}' with id ${validManifestRequest.requestId}.`);
        return;
      });
  }
}

module.exports = ManifestGather;
