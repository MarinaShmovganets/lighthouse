/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const URL = require('../lib/url-shim');

const WASTEFUL_THRESHOLD_IN_PERCENT = 1.2;

class VideoSize extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'video-size',
      description: 'Properly size videos',
      failureDescription: 'Serve oversized videos',
      helpText: 
        'Serve videos that are appropriately-sized to save cellular data ' +
        'and improve load time. ' +
        '[Learn more](https://TODO).',
      requiredArtifacts: ['VideoUsage', 'ViewportDimensions'],
    };
  }

  /**
   * @param {!Object} video
   * @param {number} DPR devicePixelRatio
   * @return {?Object}
   */
  static computeWaste(video, DPR) {
    const url = URL.elideDataURI(video.src);
    const actualSize = video.videoWidth * video.videoHeight;
    const containerSize = video.clientWidth * video.clientHeight * Math.pow(DPR, 2);
    
    return {
      url,
      actualSizeInPixels: `${video.videoWidth}x${video.videoHeight}`,
      containerSizeInPixels: `${video.clientWidth}x${video.clientHeight}`,
      isWasteful: (actualSize > containerSize * WASTEFUL_THRESHOLD_IN_PERCENT),
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const videos = artifacts.VideoUsage;
    const DPR = artifacts.ViewportDimensions.devicePixelRatio;
    
    const results = videos.map(video => VideoSize.computeWaste(video, DPR))
      .filter(processed => processed.isWasteful);
    const passed = results.length === 0;
   
    let displayValue = '';
    if (results.length > 1) {
      displayValue = `${Util.formatNumber(results.length)} oversized videos found`;
    } else if (results.length === 1) {
      displayValue = `${results.length} oversized video found`;
    }

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'actualSizeInPixels', itemType: 'text', text: 'Actual Size'},
      {key: 'containerSizeInPixels', itemType: 'text', text: 'Container Size'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      rawValue: passed,
      displayValue,
      details: tableDetails,
    };
  }
}

module.exports = VideoSize;
