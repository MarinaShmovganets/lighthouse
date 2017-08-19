/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
 /**
  * @fileoverview Checks to see if the aspect ratio of the images used on
  *   the page are equal to the aspect ratio of their display sizes. The
  *   audit will list all images that don't match with their display size
  *   aspect ratio.
  */
'use strict';

const Audit = require('./audit');

const URL = require('../lib/url-shim');

class ImageAspectRatio extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'image-aspect-ratio',
      description: 'Use Proper Aspect Ratio',
      informative: true,
      helpText: 'Serve Images that are appropriately sized as per the aspect ratio',
      requiredArtifacts: ['ImageUsage']
    };
  }

  /**
   * @param {!Object} image
   * @return {?Object}
   */
  static checkAspectRatio(image) {
    const url = URL.elideDataURI(image.src);
    const actualAspectRatio = image.naturalWidth / image.naturalHeight;
    const usedAspectRatio = image.clientWidth / image.clientHeight;
    const ratiosDontMatch = actualAspectRatio != usedAspectRatio;

    // if(!Number.isFinite(actualAspectRatio) || !Number.isFinite(usedAspectRatio)) {
    //   return new Error(`Invalid image sizing information ${url}`);
    // }

    return {
      url,
      preview: {
        type: 'thumbnail',
        url: image.networkRecord.url,
        mimeType: image.networkRecord.mimeType
      },
      ratiosDontMatch
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const images = artifacts.ImageUsage;

    let debugString;
    const resultsMap = new Map();
    images.forEach(image => {
      const processed = ImageAspectRatio.checkAspectRatio(image);
      if(processed instanceof Error) {
        debugString = processed.message;
        return;
      }

      resultsMap.set(processed.preview.url, processed);
    });

    const results = Array.from(resultsMap.values())
      .filter(item => item.ratiosDontMatch);

    const headings = [
      {key: 'preview', itemType: 'thumbnail', text: ''},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: '', itemType: 'text', text: 'Aspect Ratio (Original)'},
      {key: '', itemType: 'text', text: 'Aspect Ratio (Actual)'}
    ];

    return {
      rawValue: 'KP',
      debugString,
      details: Audit.makeTableDetails(headings, results)
    };
  }
}

module.exports = ImageAspectRatio;
