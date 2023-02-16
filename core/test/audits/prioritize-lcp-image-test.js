/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import PrioritizeLcpImage from '../../audits/prioritize-lcp-image.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';

const rootNodeUrl = 'http://example.com:3000';
const mainDocumentNodeUrl = 'http://www.example.com:3000';
const scriptNodeUrl = 'http://www.example.com/script.js';
const imageUrl = 'http://www.example.com/image.png';

describe('Performance: prioritize-lcp-image audit', () => {
  const mockArtifacts = (networkRecords, finalDisplayedUrl) => {
    return {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [PrioritizeLcpImage.DEFAULT_PASS]: createTestTrace({
          traceEnd: 6000,
          largestContentfulPaint: 4500,
        }),
      },
      devtoolsLogs: {
        [PrioritizeLcpImage.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords),
      },
      URL: {
        requestedUrl: finalDisplayedUrl,
        mainDocumentUrl: finalDisplayedUrl,
        finalDisplayedUrl,
      },
      TraceElements: [
        {
          traceEventType: 'largest-contentful-paint',
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,3,DIV,2,IMG',
          },
          type: 'image',
        },
      ],
    };
  };

  function mockContext() {
    return {
      settings: {},
      computedCache: new Map(),
    };
  }

  const mockNetworkRecords = () => {
    return [
      {
        requestId: '2',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 0,
        networkEndTime: 500,
        timing: {receiveHeadersEnd: 500},
        transferSize: 400,
        url: rootNodeUrl,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '2:redirect',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 500,
        networkEndTime: 1000,
        transferSize: 16_000,
        url: mainDocumentNodeUrl,
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '3',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 1000,
        networkEndTime: 2000,
        transferSize: 32_000,
        url: scriptNodeUrl,
        initiator: {type: 'parser', url: mainDocumentNodeUrl},
        frameId: 'ROOT_FRAME',
      },
      {
        requestId: '4',
        resourceType: 'Image',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 2000,
        networkEndTime: 4500,
        transferSize: 64_000,
        url: imageUrl,
        initiator: {type: 'script', url: scriptNodeUrl},
        frameId: 'ROOT_FRAME',
      },
    ];
  };

  it('is not applicable if TraceElements does not include LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    artifacts.TraceElements = [];
    const result = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(result).toEqual({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if LCP was not an image', async () => {
    const networkRecords = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    artifacts.TraceElements[0].type = 'text';
    const result = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(result).toEqual({
      score: null,
      notApplicable: true,
    });
  });

  it('shouldn\'t be applicable if lcp image element is not found', async () => {
    const networkRecords = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);

    // Make image paint event not apply to our node.
    const imagePaintEvent = artifacts.traces.defaultPass
        .traceEvents.find(e => e.name === 'LargestImagePaint::Candidate');
    imagePaintEvent.args.data.DOMNodeId = 1729;

    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);
  });

  it('shouldn\'t be applicable if the lcp is already preloaded', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords[3].isLinkPreload = true;
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);

    // debugData should be included even if image shouldn't be preloaded.
    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: 'http://www.example.com/image.png', initiatorType: 'script'},
        {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
        {url: 'http://www.example.com:3000', initiatorType: 'other'},
      ],
      pathLength: 3,
    });
  });

  it('shouldn\'t be applicable if the lcp request is not from over the network', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords[3].protocol = 'data';
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);
  });

  it('should suggest preloading a lcp image if all criteria is met', async () => {
    const networkRecords = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.numericValue).toEqual(30);
    expect(results.details.overallSavingsMs).toEqual(30);
    expect(results.details.items[0].url).toEqual(imageUrl);
    expect(results.details.items[0].wastedMs).toEqual(30);

    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: 'http://www.example.com/image.png', initiatorType: 'script'},
        {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
        {url: 'http://www.example.com:3000', initiatorType: 'other'},
      ],
      pathLength: 3,
    });
  });

  it('should suggest preloading when LCP is waiting on a dependency', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords[2].transferSize = 100 * 1000 * 1000;
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.numericValue).toEqual(180);
    expect(results.details.overallSavingsMs).toEqual(180);
    expect(results.details.items[0].url).toEqual(imageUrl);
    expect(results.details.items[0].wastedMs).toEqual(180);
    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: 'http://www.example.com/image.png', initiatorType: 'script'},
        {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
        {url: 'http://www.example.com:3000', initiatorType: 'other'},
      ],
      pathLength: 3,
    });
  });

  it('should use the initiator path of the first image instance loaded', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      resourceType: 'Image',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      initiator: {type: 'parser', url: mainDocumentNodeUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 0,
      details: {
        items: [],
        debugData: {
          initiatorPath: [
            {url: 'http://www.example.com/image.png', initiatorType: 'parser'},
            {url: 'http://www.example.com:3000', initiatorType: 'other'},
          ],
          pathLength: 2,
        },
      },
    });
  });

  it('should not use the initiator path of a non-image load', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      // Not an image load.
      resourceType: 'XHR',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      // Parser, not script initiator.
      initiator: {type: 'parser', url: mainDocumentNodeUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 180,
      details: {
        items: [{url: imageUrl}],
        debugData: {
          initiatorPath: [
            {url: 'http://www.example.com/image.png', initiatorType: 'script'},
            {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
            {url: 'http://www.example.com:3000', initiatorType: 'other'},
          ],
          pathLength: 3,
        },
      },
    });
  });

  it('should not use the initiator path of an image from a different frame', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      resourceType: 'Image',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      initiator: {type: 'parser', url: mainDocumentNodeUrl},
      // From different frame.
      frameId: 'CHILD_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 180,
      details: {
        items: [{url: imageUrl}],
        debugData: {
          initiatorPath: [
            {url: 'http://www.example.com/image.png', initiatorType: 'script'},
            {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
            {url: 'http://www.example.com:3000', initiatorType: 'other'},
          ],
          pathLength: 3,
        },
      },
    });
  });

  it('should follow any redirected image requests', async () => {
    const redirectedImageUrl = 'http://www.example.com/redirect.jpg';
    const networkRecords = mockNetworkRecords();

    // Redirect image request to newly added request.
    const redirectSource = networkRecords.at(-1);
    redirectSource.networkEndTime = 2500;
    redirectSource.transferSize = 708;
    redirectSource.resourceType = undefined;
    networkRecords.push({
      requestId: '4:redirect',
      resourceType: 'Image',
      priority: 'High',
      networkRequestTime: 2500,
      networkEndTime: 4500,
      transferSize: 64_000,
      url: redirectedImageUrl,
      initiator: {type: 'script', url: scriptNodeUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, mainDocumentNodeUrl);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 210,
      details: {
        items: [{url: redirectedImageUrl}],
        debugData: {
          initiatorPath: [
            {url: redirectedImageUrl, initiatorType: 'script'},
            // TOD(bckenny): missing initiator step through redirected image url.
            {url: 'http://www.example.com/script.js', initiatorType: 'parser'},
            {url: 'http://www.example.com:3000', initiatorType: 'other'},
          ],
          pathLength: 3,
        },
      },
    });
  });
});
