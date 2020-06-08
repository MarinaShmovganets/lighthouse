/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview
 * This gatherer identifies elements that contribrute to metrics in the trace (LCP, CLS, etc.).
 * We take the backend nodeId from the trace and use it to find the corresponding element in the DOM.
 */

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');
const RectHelpers = require('../../lib/rect-helpers.js');

/** @typedef {{height: Number, width: Number}} ViewportDimensions */

/**
 * @this {HTMLElement}
 * @param {string} metricName
 * @return {LH.Artifacts.TraceElement | undefined}
 */
/* istanbul ignore next */
function setAttributeMarker(metricName) {
  const elem = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement; // eslint-disable-line no-undef
  let traceElement;
  if (elem) {
    traceElement = {
      metricName,
      // @ts-ignore - put into scope via stringification
      devtoolsNodePath: getNodePath(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      selector: getNodeSelector(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      nodeLabel: getNodeLabel(elem), // eslint-disable-line no-undef
      // @ts-ignore - put into scope via stringification
      snippet: getOuterHTMLSnippet(elem), // eslint-disable-line no-undef
    };
  }
  return traceElement;
}

class TraceElements extends Gatherer {
  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {number | undefined}
   */
  static getNodeIDFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.nodeId;
  }

  /**
   * @param {Number} index
   * @param {Number} upperBound 
   */
  static getInboundIndex(index, upperBound) {
    if (index < 0) return 0;
    if (index > upperBound) return upperBound;
    return index;
  }

  /**
   * @param {Number} start
   * @param {Number} length 
   * @param {Number} viewportLength
   */
  static getClippedLength(start, length, viewportLength) {
    if (start + length < 0) return 0;
    if (start + length > viewportLength) return viewportLength - start;
    return length;
  }

  /**
   * 
   * @param {Array<number>} rect 
   * @param {Number} viewportWidth 
   * @param {Number} viewportHeight 
   */
  static getClippedRectArgs(rect, viewportWidth, viewportHeight) {
    return {
      x: TraceElements.getInboundIndex(rect[0], viewportWidth),
      y: TraceElements.getInboundIndex(rect[1], viewportHeight),
      width: TraceElements.getClippedLength(rect[0], rect[2], viewportWidth),
      height: TraceElements.getClippedLength(rect[1], rect[3], viewportHeight),
    };
  }

  /**
   * @param {Array<number>} rect
   * @param {Number} viewportWidth
   * @param {Number} viewportHeight
   * @return {LH.Artifacts.Rect}
   */
  static traceRectToLHRect(rect, viewportWidth, viewportHeight) {
    const rectArgs = TraceElements.getClippedRectArgs(rect, viewportWidth, viewportHeight);
    return RectHelpers.addRectTopAndBottom(rectArgs);
  }

  /**
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @param {LH.Artifacts.ViewportDimensions} dimensions
   * @return {Array<number>}
   */
  static getCLSNodeIdsFromMainThreadEvents(mainThreadEvents, dimensions) {
    const clsPerNodeMap = new Map();
    /** @type {Set<number>} */
    const clsNodeIds = new Set();
    const shiftEvents = mainThreadEvents
      .filter(e => e.name === 'LayoutShift')
      .map(e => e.args && e.args.data);

    const viewportHeight = dimensions.outerHeight;
    const viewportWidth = dimensions.outerWidth;
    const viewportArea = viewportHeight * viewportWidth;
    const maxViewportDimension = Math.max(viewportHeight, viewportWidth);
    let cls = 0;

    shiftEvents.forEach(event => {
      if (!event || !event.impacted_nodes) {
        return;
      }

      console.log(event.score);
      cls += event.score ? event.score : 0;

      event.impacted_nodes.forEach(node => {
        if (!node.node_id || !node.old_rect || !node.new_rect) {
          return;
        }

        const oldRect = TraceElements.traceRectToLHRect(node.old_rect, viewportWidth, viewportHeight);
        const newRect = TraceElements.traceRectToLHRect(node.new_rect, viewportWidth, viewportHeight);
        const areaOfImpact = RectHelpers.getRectArea(oldRect) +
          RectHelpers.getRectArea(newRect) -
          RectHelpers.getRectOverlapArea(oldRect, newRect);

        const distance_fraction = areaOfImpact / viewportArea;

        let prevShiftTotal = 0;
        if (clsPerNodeMap.has(node.node_id)) {
          prevShiftTotal += clsPerNodeMap.get(node.node_id);
        }
        clsPerNodeMap.set(node.node_id, prevShiftTotal + areaOfImpact);
        clsNodeIds.add(node.node_id);
      });
    });

    console.log(cls);

    const topFive = [...clsPerNodeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5).map(entry => Number(entry[0]));

    return topFive;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['TraceElements']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }
    /** @type {LH.Artifacts.ViewportDimensions} */
    const dimensions = await driver.evaluateAsync(`(${pageFunctions.getPageViewportDimensionsString}())`,
      {useIsolation: true});

    const {largestContentfulPaintEvt, mainThreadEvents} =
      TraceProcessor.computeTraceOfTab(loadData.trace);
    /** @type {Array<number>} */
    const backendNodeIds = [];

    const lcpNodeId = TraceElements.getNodeIDFromTraceEvent(largestContentfulPaintEvt);
    const clsNodeIds = TraceElements.getCLSNodeIdsFromMainThreadEvents(mainThreadEvents, dimensions);
    if (lcpNodeId) {
      backendNodeIds.push(lcpNodeId);
    }
    backendNodeIds.push(...clsNodeIds);

    const traceElements = [];
    for (let i = 0; i < backendNodeIds.length; i++) {
      const metricName =
        lcpNodeId === backendNodeIds[i] ? 'largest-contentful-paint' : 'cumulative-layout-shift';
      const resolveNodeResponse =
        await driver.sendCommand('DOM.resolveNode', {backendNodeId: backendNodeIds[i]});
      const objectId = resolveNodeResponse.object.objectId;
      const response = await driver.sendCommand('Runtime.callFunctionOn', {
        objectId,
        functionDeclaration: `function () {
          ${setAttributeMarker.toString()};
          ${pageFunctions.getNodePathString};
          ${pageFunctions.getNodeSelectorString};
          ${pageFunctions.getNodeLabelString};
          ${pageFunctions.getOuterHTMLSnippetString};
          return setAttributeMarker.call(this, '${metricName}');
        }`,
        returnByValue: true,
        awaitPromise: true,
      });

      if (response && response.result && response.result.value) {
        traceElements.push(response.result.value);
      }
    }

    return traceElements;
  }
}

module.exports = TraceElements;
