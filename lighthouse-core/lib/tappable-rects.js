/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {
  filterOutRectsContainedByOthers,
  filterOutTinyRects,
  rectsTouchOrOverlap,
  rectContainsPoint,
  getBoundingRect,
  getRectCenterPoint,
} = require('./rect-helpers');

/**
 * Merge client rects together and remove small ones. This may result in a larger overall
 * size than that of the individual client rects.
 * @param {LH.Artifacts.Rect[]} clientRects
 */
function getTappableRectsFromClientRects(clientRects) {
  // 1x1px rect shouldn't be reason to treat the rect as something the user should tap on.
  // Often they're made invisble in some obscure way anyway, and only exist for e.g. accessibiliity.
  clientRects = filterOutTinyRects(clientRects);
  clientRects = filterOutRectsContainedByOthers(clientRects);
  clientRects = mergeTouchingClientRects(clientRects);
  return clientRects;
}

/**
 * @param {number} a
 * @param {number} b
 */
function almostEqual(a, b) {
  // Sometimes a child will reach out of the parent by
  // 1px or 2px, so be somewhat tolerant for merging
  return Math.abs(a - b) <= 2;
}

/**
 * @param {LH.Artifacts.Rect[]} clientRects
 * @returns {LH.Artifacts.Rect[]}
 */
function mergeTouchingClientRects(clientRects) {
  for (let i = 0; i < clientRects.length; i++) {
    for (let j = i + 1; j < clientRects.length; j++) {
      const crA = clientRects[i];
      const crB = clientRects[j];

      /**
       * Examples of what we want to merge:
       *
       * AAABBB
       *
       * AAA
       * AAA
       * BBBBB
       */
      const rectsLineUpHorizontally =
        almostEqual(crA.top, crB.top) || almostEqual(crA.bottom, crB.bottom);
      const rectsLineUpVertically =
        almostEqual(crA.left, crB.left) || almostEqual(crA.right, crB.right);
      const canMerge =
        rectsTouchOrOverlap(crA, crB) &&
        (rectsLineUpHorizontally || rectsLineUpVertically);

      if (canMerge) {
        const replacementClientRect = getBoundingRect(crA, crB);
        const mergedRectCenter = getRectCenterPoint(replacementClientRect);

        if (
          !(
            rectContainsPoint(crA, mergedRectCenter) ||
            rectContainsPoint(crB, mergedRectCenter)
          )
        ) {
          // Don't merge because the new shape is too different from the
          // merged rects, and tapping in the middle wouldn't actually hit
          // either rect
          continue;
        }

        // Replace client rects with merged version
        clientRects = clientRects.filter(cr => cr !== crA && cr !== crB);
        clientRects.push(replacementClientRect);

        // Start over so we don't have to handle complexity introduced by array mutation.
        // Client rect ararys rarely contain more than 5 rects, so starting again doesn't cause perf issues.
        return mergeTouchingClientRects(clientRects);
      }
    }
  }

  return clientRects;
}

module.exports = {
  getTappableRectsFromClientRects,
};
