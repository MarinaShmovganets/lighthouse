/**
 * @license Copyright 2020 Sebastian Kreft All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ImageSizeResponsiveAudit = require('../../audits/image-size-responsive.js');
const assert = require('assert');

/* eslint-env jest */

const WIDTH = 800;
const HEIGHT = 600;

function generateImage(clientSize, naturalSize, props, src = 'https://google.com/logo.png') {
  const image = {src, mimeType: 'image/png'};
  const clientRect = {
    clientRect: {
      top: 0,
      bottom: clientSize.displayedHeight,
      left: 0,
      right: clientSize.displayedWidth,
    },
  };
  Object.assign(image, clientSize, naturalSize, clientRect, props);
  return image;
}

describe('Images: size audit', () => {
  function testImage(condition, data) {
    const description = `identifies when an image ${condition}`;
    it(description, () => {
      const result = ImageSizeResponsiveAudit.audit({
        ImageElements: [
          generateImage(
            {displayedWidth: data.clientSize[0], displayedHeight: data.clientSize[1]},
            {naturalWidth: data.naturalSize[0], naturalHeight: data.naturalSize[1]},
            data.props
          ),
        ],
        ViewportDimensions: {
          innerWidth: WIDTH,
          innerHeight: HEIGHT,
          devicePixelRatio: data.devicePixelRatio || 1,
        },
      });
      let details = '';
      if (result.score === 0) {
        const {displayedSize: displayed, actualSize: actual, expectedSize: expected} =
            result.details.items[0];
        details = ` (displayed: ${displayed}, actual: ${actual}, expected: ${expected})`;
      }
      assert.strictEqual(result.score, data.score, `score does not match${details}`);
    });
  }

  testImage('invalid image', {
    score: 0,
    clientSize: [100, 100],
    naturalSize: [5, 5],
  });

  describe('is empty', () => {
    testImage('is empty along width', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [0, 5],
    });

    testImage('is empty along height', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 0],
    });
  });

  describe('too small to bother testing', () => {
    testImage('is too small along width', {
      score: 1,
      clientSize: [1, 100],
      naturalSize: [5, 5],
    });

    testImage('is too small along height', {
      score: 1,
      clientSize: [100, 1],
      naturalSize: [5, 5],
    });
  });

  testImage('is an SVG image', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      mimeType: 'image/svg+xml',
    },
  });

  testImage('is a css image', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      isCss: true,
    },
  });

  testImage('uses object-fit', {
    score: 1,
    clientSize: [100, 100],
    naturalSize: [5, 5],
    props: {
      usesObjectFit: true,
    },
  });

  describe('visibility', () => {
    testImage('has no client area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
    });

    testImage('is above the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: -201 - 100,
          bottom: -201,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is almost above the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: -200 - 100,
          bottom: -200,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is below the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: HEIGHT + 201,
          bottom: HEIGHT + 201 + 100,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is almost below the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: HEIGHT + 200,
          bottom: HEIGHT + 200 + 100,
          left: 0,
          right: 100,
        },
      },
    });

    testImage('is to the left of the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: -101 - 100,
          right: -101,
        },
      },
    });

    testImage('is almost to the left of the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: -100 - 100,
          right: -100,
        },
      },
    });

    testImage('is to the right of the visible area', {
      score: 1,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: WIDTH + 101,
          right: WIDTH + 101 + 100,
        },
      },
    });

    testImage('is almost to the right of the visible area', {
      score: 0,
      clientSize: [100, 100],
      naturalSize: [5, 5],
      props: {
        clientRect: {
          top: 0,
          bottom: 100,
          left: WIDTH + 100,
          right: WIDTH + 100 + 100,
        },
      },
    });
  });

  describe('check size', () => {
    describe('DPR = 1', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [64, 64],
      });

      testImage('is an icon with an invalid size', {
        score: 0,
        clientSize: [64, 64],
        naturalSize: [63, 63],
      });

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [49, 49],
      });

      testImage('has an invalid size', {
        score: 0,
        clientSize: [65, 65],
        naturalSize: [48, 48],
      });
    });

    describe('DPR = 2', () => {
      testImage('is an icon with right size', {
        score: 1,
        clientSize: [64, 64],
        naturalSize: [128, 128],
        devicePixelRatio: 2,
      });

      testImage('is an icon with an invalid size', {
        score: 0,
        clientSize: [64, 64],
        naturalSize: [127, 127],
        devicePixelRatio: 2,
      });

      testImage('has right size', {
        score: 1,
        clientSize: [65, 65],
        naturalSize: [98, 98],
        devicePixelRatio: 2,
      });

      testImage('has an invalid size', {
        score: 0,
        clientSize: [65, 65],
        naturalSize: [97, 97],
        devicePixelRatio: 2,
      });
    });
  });

  it('de-dupes images', () => {
    const result = ImageSizeResponsiveAudit.audit({
      ImageElements: [
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20}
        ),
        generateImage(
          {displayedWidth: 160, displayedHeight: 80},
          {naturalWidth: 40, naturalHeight: 20}
        ),
        generateImage(
          {displayedWidth: 60, displayedHeight: 30},
          {naturalWidth: 40, naturalHeight: 20}
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 1,
      },
    });
    assert.equal(result.details.items.length, 1);
    assert.equal(result.details.items[0].expectedSize, '120 x 60');
  });

  it('sorts images', () => {
    const result = ImageSizeResponsiveAudit.audit({
      ImageElements: [
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'https://C.com/image.png'
        ),
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'https://A.com/image.png'
        ),
        generateImage(
          {displayedWidth: 80, displayedHeight: 40},
          {naturalWidth: 40, naturalHeight: 20},
          {},
          'https://B.com/image.png'
        ),
      ],
      ViewportDimensions: {
        innerWidth: WIDTH,
        innerHeight: HEIGHT,
        devicePixelRatio: 1,
      },
    });
    assert.equal(result.details.items.length, 3);
    const srcs = result.details.items.map(item => item.url);
    assert.deepEqual(Array.from(srcs), srcs.sort());
  });
});
