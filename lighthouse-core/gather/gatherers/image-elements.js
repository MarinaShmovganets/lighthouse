/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
  * @fileoverview Gathers all images used on the page with their src, size,
  *   and attribute information. Executes script in the context of the page.
  */
'use strict';

const DevtoolsLog = require('./devtools-log.js');
const NetworkRecords = require('../../computed/network-records.js');
const ImageElementsSnapshot = require('./image-elements-snapshot.js');

class ImageElements extends ImageElementsSnapshot {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   */
  indexNetworkRecords(networkRecords) {
    return networkRecords.reduce((map, record) => {
      // An image response in newer formats is sometimes incorrectly marked as "application/octet-stream",
      // so respect the extension too.
      const isImage = /^image/.test(record.mimeType) || /\.(avif|webp)$/i.test(record.url);
      // The network record is only valid for size information if it finished with a successful status
      // code that indicates a complete image response.
      if (isImage && record.finished && record.statusCode === 200) {
        map[record.url] = record;
      }

      return map;
    }, /** @type {Record<string, LH.Artifacts.NetworkRequest>} */ ({}));
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['ImageElements']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const indexedNetworkRecords = this.indexNetworkRecords(networkRecords);
    return this._getArtifact(context, indexedNetworkRecords);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ImageElements']>}
   */
  async afterPass(passContext, loadData) {
    const indexedNetworkRecords = this.indexNetworkRecords(loadData.networkRecords);
    return this._getArtifact({...passContext, dependencies: {}}, indexedNetworkRecords);
  }
}

module.exports = ImageElements;
