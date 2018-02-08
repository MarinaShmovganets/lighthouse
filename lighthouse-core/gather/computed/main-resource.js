/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');

/**
 * @fileoverview This artifact identifies the main resource on the page. Current solution assumes
 * that the main resource is the first non-rediected one.
 */
class MainResource extends ComputedArtifact {
  get name() {
    return 'MainResource';
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!WebInspector.NetworkRequest}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(requests => {
        let mainResource = null;

        for (/** @type {WebInspector.NetworkRequest} */const request of requests) {
          if (mainResource === null) {
            mainResource = request;
          }

          if (request.redirectSource && request.redirectSource.url === mainResource.url) {
            mainResource = request;
          }
        }

        if (!mainResource) {
          throw new Error('Unable to identify the main resource');
        }

        return mainResource;
      });
  }
}

module.exports = MainResource;
