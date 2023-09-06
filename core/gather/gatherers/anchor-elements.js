/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* global getNodeDetails */

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {resolveDevtoolsNodePathToObjectId} from '../driver/dom.js';

/* eslint-env browser, node */

/**
 * Function that is stringified and run in the page to collect anchor elements.
 * Additional complexity is introduced because anchors can be HTML or SVG elements.
 *
 * We use this evaluateAsync method because the `node.getAttribute` method doesn't actually normalize
 * the values like access from JavaScript in-page does.
 *
 * @return {LH.Artifacts['AnchorElements']}
 */
/* c8 ignore start */
function collectAnchorElements() {
  /** @param {string} url */
  const resolveURLOrEmpty = url => {
    try {
      return new URL(url, window.location.href).href;
    } catch (_) {
      return '';
    }
  };

  /** @param {HTMLAnchorElement|SVGAElement} node */
  function getTruncatedOnclick(node) {
    const onclick = node.getAttribute('onclick') || '';
    return onclick.slice(0, 1024);
  }

  /** @param {HTMLElement|SVGElement|Text|ChildNode} node */
  function getTrimmedInnerText(node) {
    return node instanceof HTMLElement
      ? node.innerText.trim()
      : (node.textContent ? node.textContent.trim() : '');
  }

  /**
   * @param {HTMLElement|SVGElement} node
   * @param {string|null} currentLang
   * @return {string}
   */
  function getLangOfInnerText(node, currentLang = null) {
    if (currentLang === null) {
      const parentWithLang = node.closest('[lang]');

      // TODO: fallback to pragma-set-default-language or HTTP header
      currentLang = !parentWithLang ? '' : parentWithLang.getAttribute('lang');
    }

    const innerElsWithLang = node.querySelectorAll('[lang]');

    if (!innerElsWithLang.length) return currentLang || '';

    const innerText = getTrimmedInnerText(node);

    let innerTextLang = currentLang;

    for (const el of node.childNodes) {
      if (innerText === getTrimmedInnerText(el)) {
        if (!(el instanceof HTMLElement || el instanceof SVGElement)) {
          return currentLang || '';
        }

        const elLang = el.getAttribute('lang');
        const childrenWithLang = el.querySelectorAll('[lang]');

        if (!childrenWithLang.length) {
          return elLang || currentLang || '';
        } else {
          return getLangOfInnerText(el, elLang || currentLang || '');
        }
      } else {
        innerTextLang = '';
      }
    }

    return innerTextLang || '';
  }

  /** @type {Array<HTMLAnchorElement|SVGAElement>} */
  // @ts-expect-error - put into scope via stringification
  const anchorElements = getElementsInDocument('a'); // eslint-disable-line no-undef

  // Check, if document has only one lang attribute in opening html or in body tag. If so,
  // there is no need to run the `getLangOfInnerText()` function with multiple
  // possible DOM traversals
  /** @type {Array<HTMLElement|SVGElement>} */
  // @ts-expect-error - put into scope via stringification
  const langElements = getElementsInDocument('body[lang], body [lang]'); // eslint-disable-line no-undef
  const documentHasNoLang = !document.documentElement.lang && langElements.length === 0;
  const canFallbackToBodyLang = (langElements.length === 1) &&
    langElements[0].nodeName === 'BODY';
  const canFallbackToHtmlLang = !canFallbackToBodyLang && (langElements.length === 0) &&
    document.documentElement.lang;
  const lang = documentHasNoLang ? '' :
    (canFallbackToBodyLang ? langElements[0].getAttribute('lang') :
    (canFallbackToHtmlLang ? document.documentElement.lang : null));

  return anchorElements.map(node => {
    if (node instanceof HTMLAnchorElement) {
      return {
        href: node.href,
        rawHref: node.getAttribute('href') || '',
        onclick: getTruncatedOnclick(node),
        role: node.getAttribute('role') || '',
        name: node.name,
        text: node.innerText, // we don't want to return hidden text, so use innerText
        textLang: lang !== null ? lang : getLangOfInnerText(node),
        rel: node.rel,
        target: node.target,
        id: node.getAttribute('id') || '',
        // @ts-expect-error - getNodeDetails put into scope via stringification
        node: getNodeDetails(node),
      };
    }

    return {
      href: resolveURLOrEmpty(node.href.baseVal),
      rawHref: node.getAttribute('href') || '',
      onclick: getTruncatedOnclick(node),
      role: node.getAttribute('role') || '',
      text: node.textContent || '',
      textLang: lang !== null ? lang : getLangOfInnerText(node),
      rel: '',
      target: node.target.baseVal || '',
      id: node.getAttribute('id') || '',
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(node),
    };
  });
}
/* c8 ignore stop */

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} devtoolsNodePath
 * @return {Promise<Array<{type: string}>>}
 */
async function getEventListeners(session, devtoolsNodePath) {
  const objectId = await resolveDevtoolsNodePathToObjectId(session, devtoolsNodePath);
  if (!objectId) return [];

  const response = await session.sendCommand('DOMDebugger.getEventListeners', {
    objectId,
  });

  return response.listeners.map(({type}) => ({type}));
}

class AnchorElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['AnchorElements']>}
   */
  async getArtifact(passContext) {
    const session = passContext.driver.defaultSession;

    const anchors = await passContext.driver.executionContext.evaluate(collectAnchorElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getElementsInDocument,
        pageFunctions.getNodeDetails,
      ],
    });
    await session.sendCommand('DOM.enable');

    // DOM.getDocument is necessary for pushNodesByBackendIdsToFrontend to properly retrieve nodeIds if the `DOM` domain was enabled before this gatherer, invoke it to be safe.
    await session.sendCommand('DOM.getDocument', {depth: -1, pierce: true});
    const anchorsWithEventListeners = anchors.map(async anchor => {
      const listeners = await getEventListeners(session, anchor.node.devtoolsNodePath);

      return {
        ...anchor,
        listeners,
      };
    });

    const result = await Promise.all(anchorsWithEventListeners);
    await session.sendCommand('DOM.disable');
    return result;
  }
}

export default AnchorElements;
