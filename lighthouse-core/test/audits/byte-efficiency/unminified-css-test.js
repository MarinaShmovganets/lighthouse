/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const KB = 1024;
const UnminifiedCssAudit = require('../../../audits/byte-efficiency/unminified-css');
const assert = require('assert');

/* eslint-env mocha */

const _resourceType = {_name: 'stylesheet'};
describe('Page uses optimized css', () => {
  describe('#computeTokenLength', () => {
    it('should compute length of meaningful content', () => {
      const full = `
        /*
         * a complicated comment
         * that is
         * several
         * lines
         */
        .my-class {
          /* a simple comment */
          width: 100px;
          height: 100px;
        }
      `;

      const minified = '.my-class{width:100px;height:100px;}';
      assert.equal(UnminifiedCssAudit.computeTokenLength(full), minified.length);
    });

    it('should handle string edge cases', () => {
      const pairs = [
        ['.my-class { content: "/*"; }', '.my-class{content:"/*";}'],
        ['.my-class { content: \'/* */\'; }', '.my-class{content:\'/* */\';}'],
        ['.my-class { content: "/*\\\\"; }', '.my-class{content:"/*\\\\";}'],
        ['.my-class { content: "/*\\""; }', '.my-class{content:"/*\\"";}'],
      ];

      for (const [full, minified] of pairs) {
        assert.equal(
          UnminifiedCssAudit.computeTokenLength(full),
          minified.length,
          `did not handle ${full} properly`
        );
      }
    });

    it('should handle comment edge cases', () => {
      const full = `
        /* here is a cool "string I found" */
        .my-class {
          content: "/*";
        }
      `;

      const minified = '.my-class{content:"/*";}';
      assert.equal(UnminifiedCssAudit.computeTokenLength(full), minified.length);
    });

    it('should handle license comments', () => {
      const full = `
        /*!
         * @LICENSE
         * Apache 2.0
         */
        .my-class {
          width: 100px;
        }
      `;

      const minified = `/*!
         * @LICENSE
         * Apache 2.0
         */.my-class{width:100px;}`;
      assert.equal(UnminifiedCssAudit.computeTokenLength(full), minified.length);
    });

    it('should handle unbalanced comments', () => {
      const full = `
        /*
        .my-class {
          width: 100px;
        }
      `;

      assert.equal(UnminifiedCssAudit.computeTokenLength(full), full.length);
    });

    it('should handle data URIs', () => {
      const uri = 'data:image/jpeg;base64,asdfadiosgjwiojasfaasd';
      const full = `
        .my-other-class {
          background: data("${uri}");
          height: 100px;
        }
     `;

      const minified = `.my-other-class{background:data("${uri}");height:100px;}`;
      assert.equal(UnminifiedCssAudit.computeTokenLength(full), minified.length);
    });

    it('should handle reeally long strings', () => {
      let hugeCss = '';
      for (let i = 0; i < 10000; i++) {
        hugeCss += `.my-class-${i} { width: 100px; height: 100px; }\n`;
      }

      assert.ok(UnminifiedCssAudit.computeTokenLength(hugeCss) < 0.9 * hugeCss.length);
    });
  });

  it('fails when given unminified stylesheets', () => {
    const auditResult = UnminifiedCssAudit.audit_(
      {
        Styles: new Map([
          [
            '123.1',
            {
              header: {sourceURL: 'foo.css'},
              content: `
                /*
                * a complicated comment
                * that is
                * several
                * lines
                */
                .my-class {
                  width: 100px;
                  height: 100px;
                }
              `.replace(/\n\s+/g, '\n'),
            },
          ],
          [
            '123.2',
            {
              header: {sourceURL: 'other.css'},
              content: `
                .my-other-class {
                  background: data("data:image/jpeg;base64,asdfadiosgjwiojasfaasd");
                  height: 100px;
                }
              `.replace(/\n\s+/g, '\n'),
            },
          ],
        ]).values(),
      },
      [
        {url: 'foo.css', _transferSize: 20 * KB, _resourceType},
        {url: 'other.css', _transferSize: 50 * KB, _resourceType},
      ]
    );

    assert.equal(auditResult.results.length, 2);
    assert.equal(auditResult.results[0].url, 'foo.css');
    assert.equal(Math.round(auditResult.results[0].wastedPercent), 65);
    assert.equal(Math.round(auditResult.results[0].wastedBytes / 1024), 13);
    assert.equal(auditResult.results[1].url, 'other.css');
    assert.equal(Math.round(auditResult.results[1].wastedPercent), 8);
    assert.equal(Math.round(auditResult.results[1].wastedBytes / 1024), 4);
  });

  it('passes when stylesheets are already minified', () => {
    const auditResult = UnminifiedCssAudit.audit_(
      {
        Styles: new Map([
          ['123.1', {header: {sourceURL: 'foo.css'}, content: '#id{width:100px;}'}],
          [
            '123.2',
            {
              header: {sourceURL: 'other.css'},
              content: `
                /* basically just one comment */
                .the-class {
                  display: block;
                }
              `.replace(/\n\s+/g, '\n'),
            },
          ],
          [
            '123.3',
            {
              header: {sourceURL: 'invalid.css'},
              content: '/* a broken comment .clasz { width: 0; }',
            },
          ],
        ]).values(),
      },
      [
        {url: 'foo.css', _transferSize: 20 * KB, _resourceType},
        {url: 'other.css', _transferSize: 512, _resourceType},
        {url: 'invalid.css', _transferSize: 20 * KB, _resourceType},
      ]
    );

    assert.equal(auditResult.results.length, 0);
  });
});
