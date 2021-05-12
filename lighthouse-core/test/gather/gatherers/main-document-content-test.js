/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const MainDocumentContent = require('../../../gather/gatherers/main-document-content.js');
const NetworkRecords = require('../../../computed/network-records.js');

jest.mock('../../../computed/network-records.js');

describe('FR compat', () => {
  /** @type {MainDocumentContent} */
  let gatherer;
  beforeEach(() => {
    gatherer = new MainDocumentContent();
    gatherer._getArtifact = jest.fn();
    NetworkRecords.request = jest.fn();
  });

  it('uses loadData in legacy mode', async () => {
    const networkRecords = ['1', '2'];

    await gatherer.afterPass({}, {networkRecords});

    expect(NetworkRecords.request).not.toHaveBeenCalled();
    expect(gatherer._getArtifact).toHaveBeenCalledWith({dependencies: {}}, networkRecords);
  });

  it('uses dependencies for FR', async () => {
    const networkRecords = ['1', '2'];
    const devtoolsLog = ['3', '4'];
    const context = {
      dependencies: {DevtoolsLog: devtoolsLog},
      computedCache: new Map(),
    };
    NetworkRecords.request.mockReturnValue(networkRecords);

    await gatherer.getArtifact(context);

    expect(NetworkRecords.request).toHaveBeenCalledWith(devtoolsLog, context);
    expect(gatherer._getArtifact).toHaveBeenCalledWith(context, networkRecords);
  });
});
