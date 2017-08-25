/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');

class CriticalRequestChains extends ComputedArtifact {

  get name() {
    return 'CriticalRequestChains';
  }

  generateChain(request) {
    return {
      request: {
        id: request.id,
        url: request.url,
        startTime: request.startTime,
        endTime: request.endTime,
        responseReceivedTime: request.responseReceivedTime,
        transferSize: request.transferSize,
      },
      children: {},
    };
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Object>}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestCriticalRequests(devtoolsLog)
      .then(criticalRequests => {
        // Create a tree of critical requests.
        const criticalRequestChains = {};
        const mappedRequests = {};

        let request = criticalRequests.shift();
        while(request) {
          if (!mappedRequests[request.id]) {
            mappedRequests[request.id] = this.generateChain(request);
          }

          const node = mappedRequests[request.id];
          const parent = request.parent;
          if (parent) {
            if (!mappedRequests[parent.id]) {
              mappedRequests[parent.id] = this.generateChain(parent);
            }

            mappedRequests[parent.id].children[request.id] = node;
          } else {
            criticalRequestChains[request.id] = node;
          }

          request = criticalRequests.shift();
        }

        return criticalRequestChains;
      });
  }
}

module.exports = CriticalRequestChains;
