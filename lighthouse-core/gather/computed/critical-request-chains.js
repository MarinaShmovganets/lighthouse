/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const RequestChains = require('./request-chains');
const WebInspector = require('../../lib/web-inspector');

class CriticalRequestChains extends ComputedArtifact {

  get name() {
    return 'CriticalRequestChains';
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

  static extractChain(records) {
    return RequestChains.extractChain(records, CriticalRequestChains.isCritical);
  }

  /**
   * @param {!DevtoolsLog} devtoolsLog
   * @param {!ComputedArtifacts} artifacts
   * @return {!Promise<!Object>}
   */
  compute_(devtoolsLog, artifacts) {
    return artifacts.requestNetworkRecords(devtoolsLog)
      .then(CriticalRequestChains.extractChain);
  }
}

module.exports = CriticalRequestChains;
