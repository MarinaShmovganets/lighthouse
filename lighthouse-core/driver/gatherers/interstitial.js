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

const Gather = require('./gather');

/* global window, document, __returnResults */

/* istanbul ignore next */
function getInterstitial() {
  const viewportSize = window.outerWidth * window.outerHeight;

  const hasNonTransparentBackground = computedStyle => {
    // Simple early exit for a solid background color.
    const bgColor = computedStyle.backgroundColor;
    const hasSolidBackground = (/#\d{6}/.test(bgColor) ||
        /rgb\(/.test(bgColor) ||
        /hsl\(/.test(bgColor) ||
        /^\w+$/.test(bgColor));

    if (hasSolidBackground) {
      return true;
    }

    // Next try rgba.
    const hasRGBA = /^rgba\([^\)]+\)/.exec(bgColor);
    if (hasRGBA !== null && hasRGBA.length >= 2) {
      const alpha = parseFloat(hasRGBA[1].split(',').slice(-1));
      if (alpha > 0) {
        return true;
      }
    }

    // Then HSLA.
    const hasHSLA = /^hsla\([^\)]+\)/.exec(bgColor);
    if (hasHSLA !== null && hasHSLA.length >= 2) {
      const alpha = parseFloat(hasHSLA[1].split(',').slice(-1));
      if (alpha > 0) {
        return true;
      }
    }

    // Finally try and see if there's a background image.
    const hasBackgroundImage = computedStyle.backgroundImage !== 'none';
    const backgroundRepeats = /repeat/.test(computedStyle.backgroundRepeat);

    return (hasBackgroundImage && backgroundRepeats);
  };

  // Walk the tree of elements...
  const candidates = [...document.querySelectorAll('*')]
    .filter(e => {
      // Check for position fixed.
      const computedStyle = window.getComputedStyle(e);
      const isFixedOrAbsolute = computedStyle.position === 'fixed' ||
          computedStyle.position === 'absolute';

      // Check for nav / drawer / lightbox elements, since these are typically okay.
      // Note: overlay is an interesting one, since it *might* be valid here, such as in the case
      // of social media post deeplinks. However it seems to be the "go to" name for an interstitial
      // so on that basis it should probably be left out. Same goes for modal.
      const regExpValidOverlays = /menu|nav|sidebar|drawer|lightbox/i;
      const isValidOverlay = regExpValidOverlays.test(e.className) ||
          regExpValidOverlays.test(e.id) ||
          regExpValidOverlays.test(e.nodeName);

      // Get the size of the element.
      const eBCR = e.getBoundingClientRect();
      const size = eBCR.width * eBCR.height;
      const isCoveringViewport = ((size / viewportSize) > 0.5);

      // Check it's visible.
      const isVisible = computedStyle.opacity > 0 &&
          computedStyle.display !== 'none' &&
          hasNonTransparentBackground(computedStyle);

      // Check it's clickable.
      const isClickable = computedStyle.pointerEvents !== 'none';

      // Only allow through fixed / absolute, non-nav/lightbox elements whose size makes them cover
      // over 50% of the available viewport, and are visible and clickable.
      return isClickable && isVisible && isFixedOrAbsolute && !isValidOverlay && isCoveringViewport;
    });

  // __returnResults is injected by evaluateAsync for passing back the result.
  __returnResults(candidates);
}

class Interstitial extends Gather {

  static get test() {
    return getInterstitial;
  }

  afterPass(options) {
    const driver = options.driver;

    return driver.evaluateAsync(`(${getInterstitial.toString()}())`)

    .then(returnedValue => {
      this.artifact = returnedValue;
    }, _ => {
      this.artifact = -1;
      return;
    });
  }
}

module.exports = Interstitial;
