/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const CrawlableAnchorsAudit = require('../../../audits/seo/crawlable-anchors.js');

/* eslint-env jest */

function runAudit({
  rawHref = '',
  onclick = '',
  name = '',
  hasClickHandler = onclick.trim().length,
}) {
  const {score} = CrawlableAnchorsAudit.audit({
    AnchorElements: [{
      rawHref,
      name,
      hasClickHandler,
      onclick,
    }],
  });

  return score;
}

describe('SEO: Crawlable anchors audit', () => {
  it('allows crawlable anchors', () => {
    assert.equal(runAudit({rawHref: '#top'}), 1, 'hash fragment identifier');
    assert.equal(runAudit({rawHref: 'mailto:name@example.com'}), 1, 'email link with a mailto URI');
    assert.equal(runAudit({rawHref: 'https://example.com'}), 1, 'absolute HTTPs URL');
    assert.equal(runAudit({rawHref: 'foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref: '/foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref: '#:~:text=string'}), 1, 'hyperlink with a text fragment');
    assert.equal(runAudit({rawHref: 'ftp://myname@host.dom'}), 1, 'an FTP hyperlink');
    assert.equal(runAudit({rawHref: 'http://172.217.20.78'}), 1, 'IP address based link');
    assert.equal(runAudit({rawHref: '//example.com'}), 1, 'protocol relative link');
    assert.equal(runAudit({rawHref: 'tel:5555555'}), 1, 'email link with a tel URI');
    assert.equal(runAudit({rawHref: '#'}), 1, 'link with only a hash symbol');
    assert.equal(runAudit({
      rawHref: '?query=string',
    }), 1, 'relative link which specifies a query string');
  });

  it('allows anchors which use a name attribute', () => {
    assert.equal(runAudit({name: 'name'}), 1, 'link with a name attribute');
  });

  it('allows anchors which use event listeners on themselves', () => {
    assert.equal(runAudit({hasClickHandler: true}), 1, 'presence of a click handler is a pass');

    const auditResultJavaScriptURI = runAudit({
      rawHref: 'javascript:void(0)',
      hasClickHandler: true,
    });
    const assertionMessage = 'hyperlink with a `javascript:` URI and a click handler';
    assert.equal(auditResultJavaScriptURI, 1, assertionMessage);
  });

  it('disallows uncrawlable anchors', () => {
    assert.equal(runAudit({}), 0, 'link with no meaningful attributes and no event handlers');
    assert.equal(runAudit({rawHref: 'file:///image.png'}), 0, 'hyperlink with a `file:` URI');
    assert.equal(runAudit({name: ' '}), 0, 'name attribute with only space characters');
    assert.equal(runAudit({rawHref: ' '}), 0, 'href attribute with only space characters');
    const assertionMessage = 'onclick attribute with only space characters';
    assert.equal(runAudit({rawHref: ' ', onclick: ' '}), 0, assertionMessage);
  });

  it('disallows javascript:void expressions in the onclick attribute', () => {
    const javaScriptVoidVariations = [
      'javascript:void(0)',
      'javascript: void(0)',
      'javascript : void(0)',
      'javascript : void ( 0 )',
      'javascript: void 0',
      'javascript:void 0',
    ];

    for (const javaScriptVoidVariation of javaScriptVoidVariations) {
      assert.equal(runAudit({rawHref: javaScriptVoidVariation}), 0, 'javascript:void variations');
    }
  });

  it('disallows window.location and window.open assignments in an onclick attribute', () => {
    const onclickVariations = [
      'window.location=',
      'window.location =',
      'window.open()',
      `window.open('')`,
      'window.open(`http://example.com`)',
      'window.open ( )',
    ];

    for (const onclickVariation of onclickVariations) {
      assert.equal(runAudit({onclick: onclickVariation}), 0, 'URL changing onclick strings');
    }
  });
});
