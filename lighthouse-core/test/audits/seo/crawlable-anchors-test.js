/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CrawlableAnchorsAudit = require('../../../audits/seo/crawlable-anchors.js');
const assert = require('assert');

/* eslint-env jest */

function runAudit(rawHref) {
  const {score} = CrawlableAnchorsAudit.audit({
    AnchorElements: [{
      rawHref,
    }],
  });

  return score;
}

describe('SEO: Crawlable anchors audit', () => {
  it('allows crawlable hrefs', () => {
    assert.equal(runAudit('#top'), 1, 'hash fragment identifier');
    assert.equal(runAudit('mailto:name@example.com'), 1, 'email link with a mailto URI');
    assert.equal(runAudit('https://example.com'), 1, 'absolute HTTPs URL');
    assert.equal(runAudit('foo'), 1, 'relative URL');
    assert.equal(runAudit('/foo'), 1, 'relative URL');
    assert.equal(runAudit('#:~:text=string'), 1, 'hyperlink with a text fragment');
    assert.equal(runAudit('ftp://myname@host.dom'), 1, 'an FTP hyperlink');
    assert.equal(runAudit('http://172.217.20.78'), 1, 'IP address based link');
    assert.equal(runAudit('//example.com'), 1, 'protocol relative link');
    assert.equal(runAudit('?query=string'), 1, 'relative link which specifies a query string');
    assert.equal(runAudit('tel:5555555'), 1, 'email link with a tel URI');
  });

  it('disallows uncrawlable hrefs', () => {
    assert.equal(runAudit(''), 0, 'link empty quotes for the href attribute');
    assert.equal(runAudit('#'), 0, 'link with only a hash symbol');
    assert.equal(runAudit('javascript:void(0)'), 0, 'hyperlink with a `javascript:` URI');
    assert.equal(runAudit('file:///image.png'), 0, 'hyperlink with a `file:` URI');
  });
});
