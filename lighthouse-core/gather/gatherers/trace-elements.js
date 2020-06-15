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

/** @typedef {{nodeId: Number, score?: Number}} TraceElementData */

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
   * @param {Array<number>} rect
   * @return {LH.Artifacts.Rect}
   */
  static traceRectToLHRect(rect) {
    const rectArgs = {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
    };
    return RectHelpers.addRectTopAndBottom(rectArgs);
  }

  /**
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @return {Array<TraceElementData>}
   */
  static getLayoutShiftElements(mainThreadEvents) {
    const clsPerNode = new Map();
    const shiftEvents = mainThreadEvents
      .filter(e => e.name === 'LayoutShift')
      .map(e => e.args && e.args.data);

    shiftEvents.forEach(event => {
      if (!event || !event.impacted_nodes || !event.score || event.had_recent_input) {
        return;
      }

      let totalAreaOfImpact = 0;
      const pixelsMovedPerNode = new Map();

      event.impacted_nodes.forEach(node => {
        if (!node.node_id || !node.old_rect || !node.new_rect) {
          return;
        }

        const oldRect = TraceElements.traceRectToLHRect(node.old_rect);
        const newRect = TraceElements.traceRectToLHRect(node.new_rect);
        const areaOfImpact = RectHelpers.getRectArea(oldRect) +
          RectHelpers.getRectArea(newRect) -
          RectHelpers.getRectOverlapArea(oldRect, newRect);

        pixelsMovedPerNode.set(node.node_id, areaOfImpact);

        totalAreaOfImpact += areaOfImpact;
      });

      [...pixelsMovedPerNode.entries()].forEach(entry => {
        const prevCLSContribution = clsPerNode.has(entry[0]) ? clsPerNode.get(entry[0]) : 0;
        const clsContribution = (entry[1] / totalAreaOfImpact) * Number(event.score);
        clsPerNode.set(entry[0], prevCLSContribution + clsContribution);
      });
    });

    const topFive = [...clsPerNode.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(entry => {
      return {
        nodeId: Number(entry[0]),
        score: Number(entry[1]),
      };
    });

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

    const {largestContentfulPaintEvt, mainThreadEvents} =
      TraceProcessor.computeTraceOfTab(loadData.trace);
    /** @type {Array<TraceElementData>} */
    const backendNodeData = [];

    const lcpNodeId = TraceElements.getNodeIDFromTraceEvent(largestContentfulPaintEvt);
    const clsNodeData = TraceElements.getLayoutShiftElements(mainThreadEvents);
    if (lcpNodeId) {
      backendNodeData.push({nodeId: lcpNodeId});
    }
    backendNodeData.push(...clsNodeData);

    const traceElements = [];
    for (let i = 0; i < backendNodeData.length; i++) {
      const backendNodeId = backendNodeData[i].nodeId;
      const metricName =
        lcpNodeId === backendNodeId ? 'largest-contentful-paint' : 'cumulative-layout-shift';
      const resolveNodeResponse =
        await driver.sendCommand('DOM.resolveNode', {backendNodeId: backendNodeId});
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
        traceElements.push({...response.result.value, score: backendNodeData[i].score});
      }
    }

    return traceElements;
  }
}

module.exports = TraceElements;
