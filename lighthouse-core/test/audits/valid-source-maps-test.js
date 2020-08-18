/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
function load(name) {
  const mapJson = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapJson), content};
}

const ValidSourceMaps = require('../../audits/valid-source-maps.js');
const fs = require('fs');
const largeBundle = load('coursehero-bundle-1');
const smallBundle = load('coursehero-bundle-2');


describe('Valid source maps audit', () => {
  it('passes when no script elements or source maps are provided', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com'},
      ScriptElements: [],
      SourceMaps: [],
    };

    const auditResult = await ValidSourceMaps.audit(artifacts);
    expect(auditResult.score).toEqual(1);
  });

  it('passes when all large, first-party JS have corresponding source maps', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com'},
      ScriptElements: [
        {src: 'https://example.com/script1.min.js', content: largeBundle.content},
        {src: 'https://example.com/script2.min.js', content: largeBundle.content},
      ],
      SourceMaps: [
        {scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        {scriptUrl: 'https://example.com/script2.min.js', map: largeBundle.map},
      ],
    };

    const auditResult = await ValidSourceMaps.audit(artifacts);
    expect(auditResult.score).toEqual(1);
  });

  it('fails when any large, first-party JS has no corresponding source map', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com'},
      ScriptElements: [
        {src: 'https://example.com/script1.min.js', content: largeBundle.content},
        {src: 'https://example.com/script2.min.js', content: largeBundle.content},
      ],
      SourceMaps: [
        {scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        //  Missing corresponding source map for large, first-party JS (script2.min.js)
      ],
    };

    const auditResult = await ValidSourceMaps.audit(artifacts);
    expect(auditResult.score).toEqual(0);
  });

  it('passes when small, first-party JS have no corresponding source maps', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com'},
      ScriptElements: [
        {src: 'https://example.com/script1.min.js', content: largeBundle.content},
        {src: 'https://example.com/script2.min.js', content: smallBundle.content},
      ],
      SourceMaps: [
        {scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        //  Missing corresponding source map for small, first-party JS (script2.min.js)
      ],
    };

    const auditResult = await ValidSourceMaps.audit(artifacts);
    expect(auditResult.score).toEqual(1);
  });

  it('passes when large, third-party JS have no corresponding source maps', async () => {
    const artifacts = {
      URL: {finalUrl: 'https://example.com'},
      ScriptElements: [
        {src: 'https://example.com/script1.min.js', content: largeBundle.content},
        {src: 'https://d36mpcpuzc4ztk.cloudfront.net/script2.js', content: largeBundle.content},
      ],
      SourceMaps: [
        {scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
      ],
    };

    const auditResult = await ValidSourceMaps.audit(artifacts);
    expect(auditResult.score).toEqual(1);
  });
});
