/**
 * @license Copyright 2020 Sebastian Kreft All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @fileoverview Checks to see if the size of the visible images used on
 *   the page are large enough with respect to the pixel ratio. The
 *   audit will list all visible images that are too small.
 */
'use strict';

const Audit = require('./audit.js');
const URL = require('../lib/url-shim.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when all images have correct sizes. */
  title: 'Displays images with correct size',
  /** Title of a Lighthouse audit that provides detail on the size of visible images on the page. This descriptive title is shown to users when not all images have correct sizes. */
  failureTitle: 'Displays images with incorrect size',
  /** Description of a Lighthouse audit that tells the user why they should maintain the correct aspect ratios for all images. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Image natural dimensions should be proportional to the display size and the ' +
    'pixel ratio to maximize image clarity. [Learn more](https://web.dev/image-size-responsive).',
  /**  Label for a column in a data table; entries in the column will be a string representing the displayed size of the image. */
  columnDisplayed: 'Displayed size',
  /**  Label for a column in a data table; entries in the column will be a string representing the actual size of the image. */
  columnActual: 'Actual size',
  /**  Label for a column in a data table; entries in the column will be a string representing the expected size of the image. */
  columnExpected: 'Expected size',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

const TOLERANCE = 0.75;

const ALLOWABLE_OFFSCREEN_X = 100;
const ALLOWABLE_OFFSCREEN_Y = 200;

/** @typedef {{url: string, elidedUrl: string, displayedSize: string, actualSize: string, expectedSize: string, expectedPixels: number}} Result */

/**
 * @param {{top: number, bottom: number, left: number, right: number}} imageRect
 * @param {{innerWidth: number, innerHeight: number}} viewportDimensions
 * @return {boolean}
 */
function isVisible(imageRect, viewportDimensions) {
  return (
    (imageRect.bottom - imageRect.top) * (imageRect.right - imageRect.left) > 0 &&
    imageRect.top <= viewportDimensions.innerHeight + ALLOWABLE_OFFSCREEN_Y &&
    imageRect.bottom >= -ALLOWABLE_OFFSCREEN_Y &&
    imageRect.left <= viewportDimensions.innerWidth + ALLOWABLE_OFFSCREEN_X &&
    imageRect.right >= -ALLOWABLE_OFFSCREEN_X
  );
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @return {boolean}
 */
function isCandidate(image) {
  if (image.displayedWidth <= 1 || image.displayedHeight <= 1) {
    return false;
  }
  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    return false;
  }
  if (image.mimeType === 'image/svg+xml') {
    return false;
  }
  if (image.isCss) {
    return false;
  }
  if (image.usesObjectFit) {
    return false;
  }
  return true;
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @param {number} DPR
 * @return {boolean}
 */
function imageHasRightSize(image, DPR) {
  const [expectedWidth, expectedHeight] =
      expectedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return image.naturalWidth >= expectedWidth && image.naturalHeight >= expectedHeight;
}

/**
 * @param {LH.Artifacts.ImageElement} image
 * @param {number} DPR
 * @return {Result}
 */
function getResult(image, DPR) {
  const [expectedWidth, expectedHeight] =
      expectedImageSize(image.displayedWidth, image.displayedHeight, DPR);
  return {
    url: image.src,
    elidedUrl: URL.elideDataURI(image.src),
    displayedSize: `${image.displayedWidth} x ${image.displayedHeight}`,
    actualSize: `${image.naturalWidth} x ${image.naturalHeight}`,
    expectedSize: `${expectedWidth} x ${expectedHeight}`,
    expectedPixels: expectedWidth * expectedHeight,
  };
}

/**
 * Compute the size an image should have given the display dimensions and pixel density.
 *
 * For smaller images, typically icons, the size must be proportional to the density.
 * For larger images some tolerance is allowed as in those cases the perceived degradation is not
 * that bad.
 *
 * @param {number} displayedWidth
 * @param {number} displayedHeight
 * @param {number} DPR
 * @return {[number, number]}
 */
function expectedImageSize(displayedWidth, displayedHeight, DPR) {
  let factor = DPR;
  if (displayedWidth > 64 || displayedHeight > 64) {
    factor *= TOLERANCE;
  }
  const width = Math.ceil(factor * displayedWidth);
  const height = Math.ceil(factor * displayedHeight);
  return [width, height];
}

/**
 * Remove repeated entries for the same source and sort them by source.
 *
 * It will keep the entry with the largest size.
 *
 * @param {Result[]} results
 * @return {Result[]}
 */
function deduplicateAndSortResults(results) {
  results.sort((a, b) => a.url === b.url ? 0 : (a.url < b. url ? -1 : 1));
  const deduplicated = /** @type {Result[]} */ ([]);
  for (const r of results) {
    if (deduplicated.length > 0 && r.url === deduplicated[deduplicated.length - 1].url) {
      // If the URL was the same, this is a duplicate. Keep the largest image.
      if (deduplicated[deduplicated.length - 1].expectedPixels < r.expectedPixels) {
        deduplicated[deduplicated.length - 1] = r;
      }
    } else {
      deduplicated.push(r);
    }
  }
  return deduplicated;
}

class ImageSizeResponsive extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'image-size-responsive',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ImageElements', 'ViewportDimensions'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const DPR = artifacts.ViewportDimensions.devicePixelRatio;
    const results = Array
      .from(artifacts.ImageElements)
      .filter(isCandidate)
      .filter(image => !imageHasRightSize(image, DPR))
      .filter(image => isVisible(image.clientRect, artifacts.ViewportDimensions))
      .map(image => getResult(image, DPR));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', itemType: 'thumbnail', text: ''},
      {key: 'elidedUrl', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'displayedSize', itemType: 'text', text: str_(UIStrings.columnDisplayed)},
      {key: 'actualSize', itemType: 'text', text: str_(UIStrings.columnActual)},
      {key: 'expectedSize', itemType: 'text', text: str_(UIStrings.columnExpected)},
    ];

    return {
      score: Number(results.length === 0),
      details: Audit.makeTableDetails(headings, deduplicateAndSortResults(results)),
    };
  }
}

module.exports = ImageSizeResponsive;
module.exports.UIStrings = UIStrings;
