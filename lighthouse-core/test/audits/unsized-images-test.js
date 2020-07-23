/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UnSizedImagesAudit = require('../../audits/unsized-images.js');

/* eslint-env jest */

function generateImage(props, src = 'https://google.com/logo.png', isCss = false) {
  const image = {src, isCss};
  Object.assign(image, props);
  return image;
}

describe('Sized images audit', () => {
  function testImage(condition, data) {
    const description = `handles when an image ${condition}`;
    it(description, async () => {
      const result = await UnSizedImagesAudit.audit({
        ImageElements: [
          generateImage(
            data.props
          ),
        ],
      });
      expect(result.score).toEqual(data.score);
    });
  }

  testImage('is a css image', {
    score: 1,
    props: {
      isCss: true,
      attributeWidth: '',
      attributeHeight: '',
    },
  });

  describe('has empty', () => {
    testImage('has empty width attribute', {
      score: 0,
      props: {
        attributeWidth: '',
        attributeHeight: '100',
      },
    });

    testImage('has empty height attribute', {
      score: 0,
      props: {
        attributeWidth: '100',
        attributeHeight: '',
      },
    });

    testImage('has empty width and height attributes', {
      score: 0,
      props: {
        attributeWidth: '',
        attributeHeight: '',
      },
    });
  });

  describe('has invalid', () => {
    testImage('has invalid width attribute', {
      score: 0,
      props: {
        attributeWidth: '-200',
        attributeHeight: '100',
      },
    });

    testImage('has invalid height attribute', {
      score: 0,
      props: {
        attributeWidth: '100',
        attributeHeight: '300.5',
      },
    });

    testImage('has invalid width and height attributes', {
      score: 0,
      props: {
        attributeWidth: '0',
        attributeHeight: '100/2',
      },
    });
  });

  testImage('has valid width and height attributes', {
    score: 1,
    props: {
      attributeWidth: '100',
      attributeHeight: '100',
    },
  });

  it('is not applicable when there are no images', async () => {
    const result = await UnSizedImagesAudit.audit({
      ImageElements: [],
    });
    expect(result.notApplicable).toEqual(true);
    expect(result.score).toEqual(1);
  });

  it('can return multiple unsized images', async () => {
    const result = await UnSizedImagesAudit.audit({
      ImageElements: [
        generateImage(
          {
            attributeWidth: '',
            attributeHeight: '',
          },
          'image1.png'
        ),
        generateImage(
          {
            attributeWidth: '100',
            attributeHeight: '150',
          },
          'image2.png'
        ),
        generateImage(
          {
            attributeWidth: '',
            attributeHeight: '',
          },
          'image3.png'
        ),
      ],
    });
    expect(result.score).toEqual(0);
    expect(result.details.items).toHaveLength(2);
    const srcs = result.details.items.map(item => item.url);
    expect(srcs).toEqual(['image1.png', 'image3.png']);
  });
});

describe('Size attribute validity check', () => {
  it('fails on non-numeric characters', () => {
    expect(UnSizedImagesAudit.isValidAttr('zero')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('1002$')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('s-5')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('3,000')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('100.0')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('2/3')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('-2020')).toEqual(false);
    expect(UnSizedImagesAudit.isValidAttr('+2020')).toEqual(false);
  });

  it('fails on zero input', () => {
    expect(UnSizedImagesAudit.isValidAttr('0')).toEqual(false);
  });

  it('passes on non-zero non-negative integer input', () => {
    expect(UnSizedImagesAudit.isValidAttr('1')).toEqual(true);
    expect(UnSizedImagesAudit.isValidAttr('250')).toEqual(true);
    expect(UnSizedImagesAudit.isValidAttr('4000000')).toEqual(true);
  });
});

describe('CSS size property validity check', () => {
  it('fails if it was never defined', () => {
    expect(UnSizedImagesAudit.isValidCss(undefined)).toEqual(false);
  });

  it('fails if it is empty', () => {
    expect(UnSizedImagesAudit.isValidCss('')).toEqual(false);
  });

  it('fails if it is auto', () => {
    expect(UnSizedImagesAudit.isValidCss('auto')).toEqual(false);
  });

  it('passes if it is defined and not auto', () => {
    expect(UnSizedImagesAudit.isValidCss('200')).toEqual(true);
  });
});
