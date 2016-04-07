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

const MANIFEST_LOAD_TIMEOUT = 10000;
const Gather = require('./gather');
const manifestParser = require('../helpers/manifest-parser');

class Manifest extends Gather {
  /**
   * Create an empty ManifestNode artifact with a debugString for manifest
   * gathering error states.
   * @param {string} errorString
   * @return {!ManifestNode<undefined>}
   * @private
   */
  static _errorManifest(errorString) {
    return {
      manifest: {
        raw: undefined,
        value: undefined,
        debugString: errorString
      }
    };
  }

  /**
   * @private
   */
  static _createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((internalResolve, internalReject) => {
      resolve = internalResolve;
      reject = internalReject;
    });

    return {
      promise,
      resolve,
      reject
    };
  }

  /**
   * Creates a listener for manifests in network requests, a load timeout, and
   * a promise they resolve when complete.
   * @private
   */
  static _resolveOnManifest() {
    const manifestDeferred = Manifest._createDeferred();

    setTimeout(_ => manifestDeferred.resolve(null), MANIFEST_LOAD_TIMEOUT);

    const manifestListener = function(request) {
      const resourceType = request.resourceType();
      if (resourceType && resourceType.name() === 'manifest') {
        manifestDeferred.resolve(request);
      }
    };

    return {
      listener: manifestListener,
      promise: manifestDeferred.promise
    };
  }

  static gather(options) {
    const driver = options.driver;

    const manifestLoad = Manifest._resolveOnManifest();

    return driver.beginNetworkCollect(manifestLoad.listener)
      // Trigger a fetch of the manifest by Chrome.
      .then(_ => driver.sendCommand('Page.requestAppBanner'))

      // Wait on grabbing the finished manifest network request (or timing out).
      .then(_ => manifestLoad.promise)

      .then(manifestRequest => {
        if (!manifestRequest) {
          return Manifest._errorManifest('Timed out waiting for manifest to load.');
        }
        if (manifestRequest.statusCode >= 400) {
          const reason = `${manifestRequest.statusCode}: ${manifestRequest.statusText}`;
          return Manifest._errorManifest(
              `Unable to fetch manifest at '${manifestRequest.url}' (${reason}).`);
        }

        // On successful request, grab the manifest request body for parsing.
        return driver.sendCommand('Network.getResponseBody', {
          requestId: manifestRequest.requestId
        })
          .then(response => {
            return {
              manifest: manifestParser(response.body)
            };
          })
          .catch(_ => {
            return Manifest._errorManifest('Network recorder unable to find request for ' +
                `'${manifestRequest.url}' with id ${manifestRequest.requestId}.`);
          });

      // Shut down network collect before returning artifact.
      }).then(manifestArtifact => {
        return driver.endNetworkCollect()
          .then(_ => manifestArtifact);
      });
  }
}

module.exports = Manifest;
