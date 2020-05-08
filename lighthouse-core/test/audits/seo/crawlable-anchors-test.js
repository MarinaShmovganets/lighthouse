/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CrawlableAnchorsAudit = require('../../../audits/seo/crawlable-anchors.js');
const assert = require('assert');

/* eslint-env jest */

function runAudit({rawHref, listeners, name = ''}) {
  const {score} = CrawlableAnchorsAudit.audit({
    AnchorElements: [{
      rawHref,
      name,
      ...(listeners && listeners.length && {listeners}),
    }],
  });

  return score;
}

describe('SEO: Crawlable anchors audit', () => {
  it('allows crawlable anchors', () => {
    assert.equal(runAudit({rawHref:'#top'}), 1, 'hash fragment identifier');
    assert.equal(runAudit({rawHref:'mailto:name@example.com'}), 1, 'email link with a mailto URI');
    assert.equal(runAudit({rawHref:'https://example.com'}), 1, 'absolute HTTPs URL');
    assert.equal(runAudit({rawHref:'foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref:'/foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref:'#:~:text=string'}), 1, 'hyperlink with a text fragment');
    assert.equal(runAudit({rawHref:'ftp://myname@host.dom'}), 1, 'an FTP hyperlink');
    assert.equal(runAudit({rawHref:'http://172.217.20.78'}), 1, 'IP address based link');
    assert.equal(runAudit({rawHref:'//example.com'}), 1, 'protocol relative link');
    assert.equal(runAudit({rawHref:'?query=string'}), 1, 'relative link which specifies a query string');
    assert.equal(runAudit({rawHref:'tel:5555555'}), 1, 'email link with a tel URI');
    assert.equal(runAudit({rawHref:'#'}), 1, 'link with only a hash symbol');
    assert.equal(runAudit({rawHref:'', name: 'name'}), 1, 'link with a name attribute');
  });

  it('allows certain anchors which use event listeners on themselves', () => {
    const auditResultJavaScriptURI = runAudit({
      rawHref:'javascript:void(0)',
      listeners: [{type: 'click'}],
    });
    assert.equal(auditResultJavaScriptURI, 1, 'hyperlink with a `javascript:` URI');

    const auditResultEmptyQuotes = runAudit({
      rawHref:'',
      listeners: [{type: 'click'}],
    });
    assert.equal(auditResultEmptyQuotes, 1, 'link with empty quotes for the href attribute');
  });

  it('checks the validity of the listeners', () => {
    const auditResultBadEvent = runAudit({
      rawHref:'',
      listeners: [{type: 'no'}],
    });
    assert.equal(auditResultBadEvent, 0, 'link with unsupported event listener');

    const auditResultGoodEvent = runAudit({
      rawHref:'',
      listeners: [{type: 'no'}, {type: 'click'}],
    });
    assert.equal(auditResultGoodEvent, 1, 'link with one supported and one unsupported event listener');
  });

  it('disallows uncrawlable anchors', () => {
    assert.equal(runAudit({rawHref:'javascript:void(0)'}), 0, 'hyperlink with a `javascript:` URI');
    assert.equal(runAudit({rawHref:''}), 0, 'link with empty quotes for the href attribute');
    assert.equal(runAudit({rawHref:'file:///image.png'}), 0, 'hyperlink with a `file:` URI');
  });
});
