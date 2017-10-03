/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const ViewportAudit = require('../viewport');
const CSSStyleDeclaration = require('../../lib/web-inspector').CSSStyleDeclaration;
const MINIMAL_LEGIBLE_FONT_SIZE_PX = 16;
const MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT = 75;

/**
 * @param {!Array<{textLength:number}>} rules
 * @returns number
 */
function getTotalTextLength(rules) {
  return rules.reduce((sum, item) => sum + item.textLength, 0);
}

/**
 * @param {Array<{cssRule: WebInspector.CSSStyleDeclaration, fontSize: number, textLength: number, node: Node}>} fontSizeArtifact
 * @returns {Array<{cssRule: WebInspector.CSSStyleDeclaration, fontSize: number, textLength: number, node: Node}>}
 */
function getFailingRules(fontSizeArtifact) {
  const failingRules = new Map();

  fontSizeArtifact.forEach(({cssRule, fontSize, textLength, node}) => {
    if (fontSize >= MINIMAL_LEGIBLE_FONT_SIZE_PX) {
      return;
    }

    const artifactId = getFontArtifactId(cssRule, node);
    const failingRule = failingRules.get(artifactId);

    if (!failingRule) {
      failingRules.set(artifactId, {
        node,
        cssRule,
        fontSize,
        textLength
      });
    } else {
      failingRule.textLength += textLength;
    }
  });

  return failingRules.valuesArray();
}

function nodeToString(node) {
  return node.localName;
}

/**
 * @param {WebInspector.CSSStyleDeclaration} rule
 * @param {Node} node
 * @returns string
 */
function getOriginDescription(rule, node) {
  if (!rule) {
    return 'User Agent Stylesheet';
  }

  if (rule.type === CSSStyleDeclaration.Type.Attributes) {
    return `Attributes Style: ${nodeToString(node)}`;
  }

  if (rule.type === CSSStyleDeclaration.Type.Inline) {
    return `Inline Style: ${nodeToString(node)}`;
  }

  if (rule.type === CSSStyleDeclaration.Type.Regular && rule.parentRule) {
    const selector = rule.parentRule.selectors.map(item => item.text).join(', ');
    return `CSS Selector: ${selector}`;
  }

  return 'unknown';
}

/**
 * @param {WebInspector.CSSStyleDeclaration} rule
 * @param {Node} node
 * @return string
 */
function getFontArtifactId(rule, node) {
  if (!rule) {
    return 'user-agent';
  } else if (rule.type === CSSStyleDeclaration.Type.Regular) {
    return `${rule.styleSheetId}@${rule.range.startLine}:${rule.range.startColumn}`;
  } else {
    return `node_${node.nodeId}`;
  }
}

class FontSize extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Mobile friendly',
      name: 'font-size',
      description: 'Document uses legible font sizes.',
      failureDescription: 'Document doesn\'t use legible font sizes.',
      helpText: 'Font sizes less than 16px are too small to be legible and require mobile ' +
      'visitors to “pinch to zoom” in order to read. ' +
      '[Learn more](https://developers.google.com/speed/docs/insights/UseLegibleFontSizes).',
      requiredArtifacts: ['FontSize']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const hasViewportSet = ViewportAudit.audit(artifacts).rawValue;
    if (!hasViewportSet) {
      return {
        rawValue: false,
        debugString: 'Text is illegible because of a missing viewport config',
      };
    }

    const totalTextLenght = getTotalTextLength(artifacts.FontSize);

    if (totalTextLenght === 0) {
      return {
        rawValue: true,
        debugString: 'Page contains no text',
      };
    }

    const failingRules = getFailingRules(artifacts.FontSize);
    const failingTextLength = getTotalTextLength(failingRules);
    const percentageOfPassingText = (totalTextLenght - failingTextLength) / totalTextLenght * 100;

    const headings = [
      {key: 'origin', itemType: 'code', text: 'Origin'},
      {key: 'percentage', itemType: 'text', text: '% of text'},
      {key: 'fontSize', itemType: 'text', text: 'Font Size'}
    ];

    const tableData = failingRules.sort((a, b) => b.textLength - a.textLength)
      .map(({cssRule, node, textLength, fontSize}) => {
        const percentageOfAffectedText = textLength / totalTextLenght * 100;

        return {
          origin: getOriginDescription(cssRule, node),
          percentage: `${percentageOfAffectedText.toFixed(2)}%`,
          fontSize: `${fontSize}px`,
        };
      });
    const details = Audit.makeTableDetails(headings, tableData);
    const passed = percentageOfPassingText >= MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT;

    return {
      rawValue: passed,
      details,
      debugString: passed ?
        `${percentageOfPassingText.toFixed(2)}% of text is legible` :
        `${(100 - percentageOfPassingText).toFixed(2)}% of text is too small.`
    };
  }
}

module.exports = FontSize;
