/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const ComputedArtifact = require('./computed-artifact');
const WebInspector = require('../../lib/web-inspector');

class CriticalRequests extends ComputedArtifact {

  get name() {
    return 'CriticalRequests';
  }

  /**
   * For now, we use network priorities as a proxy for "render-blocking"/critical-ness.
   * It's imperfect, but there is not a higher-fidelity signal available yet.
   * @see https://docs.google.com/document/d/1bCDuq9H1ih9iNjgzyAL0gpwNFiEP4TZS-YLRp_RuMlc
   * @param  {any} request
   */
  static isCritical(request) {
    const resourceTypeCategory = request._resourceType && request._resourceType._category;

    // XHRs are fetched at High priority, but we exclude them, as they are unlikely to be critical
    // Images are also non-critical.
    // Treat any images missed by category, primarily favicons, as non-critical resources
    const nonCriticalResourceTypes = [
      WebInspector.resourceTypes.Image._category,
      WebInspector.resourceTypes.XHR._category
    ];
    if (nonCriticalResourceTypes.includes(resourceTypeCategory) ||
        request.mimeType && request.mimeType.startsWith('image/')) {
      return false;
    }

    return ['VeryHigh', 'High', 'Medium'].includes(request.priority());
  }

  static flattenRequest(record) {
    const ancestor = record.initiatorRequest();

    return {
      id: record._requestId,
      url: record._url,
      startTime: record.startTime,
      endTime: record.endTime,
      responseReceivedTime: record.responseReceivedTime,
      transferSize: record.transferSize,
      parent: ancestor ? this.flattenRequest(ancestor) : null,
    };
  }

  static extractRequests(networkRecords) {
    networkRecords = networkRecords.filter(req => req.finished);

    // Get all the critical requests.
    /** @type {!Array<NetworkRequest>} */
    const criticalRequests = networkRecords.filter(req => CriticalRequests.isCritical(req));
    const requestIds = [];

    // Create a tree of critical requests.
    const flattenedRequests = [];
    for (const request of criticalRequests) {
      // Work back from this request up to the root. If by some weird quirk we are giving request D
      // here, which has ancestors C, B and A (where A is the root), we will build array [C, B, A]
      // during this phase.
      const ancestors = [];
      let ancestorRequest = request.initiatorRequest();
      while (ancestorRequest) {
        const ancestorIsCritical = CriticalRequests.isCritical(ancestorRequest);

        // If the parent request isn't a high priority request it won't be in the
        // requestIdToRequests map, and so we can break the chain here. We should also
        // break it if we've seen this request before because this is some kind of circular
        // reference, and that's bad.
        if (!ancestorIsCritical || ancestors.includes(ancestorRequest._requestId)) {
          // Set the ancestors to an empty array and unset node so that we don't add
          // the request in to the tree.
          ancestors.length = 0;
          break;
        }

        ancestors.push(ancestorRequest._requestId);
        ancestorRequest = ancestorRequest.initiatorRequest();
      }

      const isAlreadyLogged = requestIds.indexOf(request._requestId) === -1;
      const isHighPriorityChain = !request.initiatorRequest() || ancestors.length;
      if (isAlreadyLogged && isHighPriorityChain) {
        flattenedRequests.push(CriticalRequests.flattenRequest(request));
        requestIds.push(request._requestId);
      }
    }

    return flattenedRequests;
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Object>}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(CriticalRequests.extractRequests);
  }
}

module.exports = CriticalRequests;
