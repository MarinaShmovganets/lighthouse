/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ImageRecords = require('../../computed/image-records.js');
const NetworkRequest = require('../../lib/network-request.js');

/**
 * @param {Partial<LH.Artifacts.NetworkRequest>=} partial
 * @return {LH.Artifacts.NetworkRequest}
 */
function mockRequest(partial = {}) {
  const request = new NetworkRequest();
  return Object.assign(request, partial);
}

describe('.indexNetworkRecords', () => {
  it('maps image urls to network records', () => {
    const networkRecords = [
      mockRequest({
        mimeType: 'image/png',
        url: 'https://example.com/img.png',
        finished: true,
        statusCode: 200,
      }),
      mockRequest({
        mimeType: 'application/octect-stream',
        url: 'https://example.com/img.webp',
        finished: true,
        statusCode: 200,
      }),
      mockRequest({
        mimeType: 'application/octect-stream',
        url: 'https://example.com/img.avif',
        finished: true,
        statusCode: 200,
      }),
    ];

    const index = ImageRecords.indexNetworkRecords(networkRecords);

    expect(index).toEqual({
      'https://example.com/img.avif': mockRequest({
        finished: true,
        mimeType: 'application/octect-stream',
        statusCode: 200,
        url: 'https://example.com/img.avif',
      }),
      'https://example.com/img.png': mockRequest({
        finished: true,
        mimeType: 'image/png',
        statusCode: 200,
        url: 'https://example.com/img.png',
      }),
      'https://example.com/img.webp': mockRequest({
        finished: true,
        mimeType: 'application/octect-stream',
        statusCode: 200,
        url: 'https://example.com/img.webp',
      }),
    });
  });

  it('ignores bad status codes', () => {
    const networkRecords = [
      mockRequest({
        mimeType: 'image/png',
        url: 'https://example.com/img.png',
        finished: true,
        statusCode: 200,
      }),
      mockRequest({
        mimeType: 'application/octect-stream',
        url: 'https://example.com/img.webp',
        finished: false,
      }),
      mockRequest({
        mimeType: 'application/octect-stream',
        url: 'https://example.com/img.avif',
        finished: true,
        statusCode: 404,
      }),
    ];

    const index = ImageRecords.indexNetworkRecords(networkRecords);

    expect(index).toEqual({
      'https://example.com/img.png': mockRequest({
        finished: true,
        mimeType: 'image/png',
        statusCode: 200,
        url: 'https://example.com/img.png',
      }),
    });
  });
});
