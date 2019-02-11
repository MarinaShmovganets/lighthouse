/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/html/renderer/util.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const SnippetRenderer = require('../../../../report/html/renderer/snippet-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(
  __dirname + '/../../../../report/html/templates.html',
  'utf8'
);

/* Generates an snippet lines array like this:
  availableLineRanges: [{from: 1, to: 4}]
  Return value: [
    {number: 1, content 'L1'},
    {number: 2, content 'L2'},
    {number: 3, content 'L3'},
    {number: 4, content 'L4'}
  ];
*/
function generateLinesArray(availableLineRanges) {
  const lines = [];
  availableLineRanges.forEach(({from, to}) => {
    for (let i = from; i <= to; i++) {
      lines.push({
        lineNumber: i,
        content: 'L' + i,
      });
    }
  });
  return lines;
}

function makeSnippetDetails({
  lineMessages,
  generalMessages,
  lines = null,
  availableLineRanges = null,
  title = 'Snippet',
  lineCount,
}) {
  return {
    type: 'snippet',
    title: title,
    lines: lines || generateLinesArray(availableLineRanges),
    lineMessages,
    generalMessages,
    lineCount,
  };
}

describe('DetailsRenderer', () => {
  let dom;

  beforeAll(() => {
    global.Util = Util;
    const {document} = new jsdom.JSDOM(TEMPLATE_FILE).window;
    dom = new DOM(document);
  });

  afterAll(() => {
    global.Util = undefined;
  });

  function renderSnippet(details) {
    const el = SnippetRenderer.render(dom, dom.document(), details, {});

    return {
      el,
      contentLines: el.querySelectorAll('.lh-snippet__line--content'),
      collapsedContentLines: el.querySelectorAll(
        '.lh-snippet__line--content.lh-snippet__show-if-expanded'
      ),
      uncollapsedContentLines: el.querySelectorAll(
        '.lh-snippet__line--content:not(.lh-snippet__show-if-expanded)'
      ),
      messageLines: el.querySelectorAll('.lh-snippet__line--message'),
      omittedLinesIndicatorsWhenExpanded: el.querySelectorAll(
        '.lh-snippet__line--placeholder:not(.lh-snippet__show-if-collapsed)'
      ),
      omittedLinesIndicatorsWhenCollapsed: el.querySelectorAll(
        '.lh-snippet__line--placeholder:not(.lh-snippet__show-if-expanded)'
      ),
      title: el.querySelector('.lh-snippet__title'),
      toggleExpandButton: el.querySelector('.lh-snippet__toggle-expand'),
    };
  }

  it.only('Renders snippet with a message at the very top', () => {
    const details = makeSnippetDetails({
      lineMessages: [
        {
          lineNumber: 1,
          message: 'Error',
        },
      ],
      generalMessages: [],
      availableLineRanges: [{from: 1, to: 6}],
      lineCount: 100,
    });
    const {contentLines, messageLines, collapsedContentLines} = renderSnippet(details);

    // 5 lines are visible, 1 is collapsed
    assert.equal(collapsedContentLines.length, 1);
    // All available lines are shown on expansion
    assert.equal(contentLines.length, 6);
    // 100 lines in total, so lines towards the end won't be shown
    const lastLine = contentLines[contentLines.length - 1];
    assert.equal(lastLine.nextSibling.textContent.trim(), '…');

    // Shows message for second line
    assert.equal(messageLines[0].textContent.trim(), 'Error');
    assert.equal(messageLines[0].previousSibling.textContent.replace(/\s/g, ''), '1L1');
  });

  it('Renders first few lines if there are no messages', () => {
    const details = makeSnippetDetails({
      lineMessages: [],
      generalMessages: [],
      availableLineRanges: [{from: 1, to: 6}],
      lineCount: 100,
    });
    const {
      uncollapsedContentLines,
      omittedLinesIndicatorsWhenExpanded,
      omittedLinesIndicatorsWhenCollapsed,
    } = renderSnippet(details);
    const lastUncollapsedLine = uncollapsedContentLines[uncollapsedContentLines.length - 1];

    // Shows first 5 visible lines
    assert.equal(lastUncollapsedLine.textContent.replace(/\s/g, ''), '5L5');
    // "..." after the available lines, but only shows in expanded state
    assert.equal(omittedLinesIndicatorsWhenExpanded.length, 1);
    assert.equal(omittedLinesIndicatorsWhenCollapsed.length, 0);
  });

  it('Renders first few lines if there are no messages for specific lines', () => {
    const details = makeSnippetDetails({
      lineMessages: [],
      generalMessages: [
        {
          message: 'General error',
        },
      ],
      availableLineRanges: [{from: 1, to: 6}],
      lineCount: 100,
    });
    const {uncollapsedContentLines, messageLines} = renderSnippet(details);
    const lastUncollapsedLine = uncollapsedContentLines[uncollapsedContentLines.length - 1];

    // Shows message
    assert.equal(messageLines.length, 1);

    // Shows first 5 visible lines
    assert.equal(lastUncollapsedLine.textContent.replace(/\s/g, ''), '5L5');
  });

  it('Renders snippet with multiple messages surrounded by other lines', () => {
    const details = makeSnippetDetails({
      lineMessages: [
        {
          lineNumber: 40,
          message: 'Error 1',
        },
        {
          lineNumber: 70,
          message: 'Error 2',
        },
      ],
      generalMessages: [],
      availableLineRanges: [
        {
          from: 30,
          to: 50,
        },
        {
          from: 60,
          to: 80,
        },
      ],
      lineCount: 100,
    });
    const {
      collapsedContentLines,
      omittedLinesIndicatorsWhenCollapsed,
      omittedLinesIndicatorsWhenExpanded,
    } = renderSnippet(details);

    // first available line is collapsed
    assert.equal(collapsedContentLines[0].textContent.replace(/\s/g, ''), '30L30');

    // puts omitted lines placeholder between the two messages
    assert.equal(omittedLinesIndicatorsWhenCollapsed.length, 1);
    // puts omitted lines placeholder between the two messages and around the whole snippet
    assert.equal(omittedLinesIndicatorsWhenExpanded.length, 3);
  });

  it('Can render both line-specific and non line-specific messages in one snippet', () => {
    const details = makeSnippetDetails({
      lineMessages: [
        {
          lineNumber: 5,
          message: 'Error on line',
        },
      ],
      generalMessages: [
        {
          message: 'General error',
        },
      ],
      availableLineRanges: [{from: 1, to: 6}],
      lineCount: 100,
    });
    const {messageLines} = renderSnippet(details);

    assert.equal(messageLines.length, 2);
  });

  it('Renders a snippet header and allows toggling the expanded state', () => {
    const details = makeSnippetDetails({
      title: 'Test Snippet',
      lineMessages: [],
      generalMessages: [],
      availableLineRanges: [{from: 1, to: 6}],
      lineCount: 100,
    });
    const {title, toggleExpandButton, el} = renderSnippet(details);

    // Renders title
    assert.ok(title.textContent.includes('Test Snippet'));
    // Renders toggle button
    assert.ok(toggleExpandButton);
    assert.ok(!el.classList.contains('lh-snippet--expanded'));

    toggleExpandButton.click();
    assert.ok(el.classList.contains('lh-snippet--expanded'));
  });

  it('Does not render toggle button if all available lines are already visible', () => {
    const details = makeSnippetDetails({
      title: 'Test Snippet',
      lineMessages: [],
      generalMessages: [],
      // We show all 5 lines by default, so there's nothing to expand
      availableLineRanges: [{from: 1, to: 5}],
    });
    const {toggleExpandButton} = renderSnippet(details);

    assert.ok(!toggleExpandButton);
  });

  it('Adds ... to lines that have been truncated', () => {
    const details = makeSnippetDetails({
      lineMessages: [],
      generalMessages: [],
      lines: [{
        content: 'abc',
        lineNumber: 1,
        truncated: true,
      }, {
        content: 'xyz',
        lineNumber: 2,
      }],
      lineCount: 2,
    });
    const {contentLines} = renderSnippet(details);

    assert.ok(contentLines[0].textContent.includes('…'));
    assert.ok(!contentLines[1].textContent.includes('…'));
  });
});
