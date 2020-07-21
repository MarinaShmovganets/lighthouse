/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const TraceElementsGatherer = require('../../../gather/gatherers/trace-elements.js');

describe('Trace Elements gatherer - GetTopLayoutShiftElements', () => {
  function makeLayoutShiftTraceEvent(score, impactedNodes, had_recent_input = false) {
    return {
      name: 'LayoutShift',
      cat: 'loading',
      ph: 'I',
      pid: 4998,
      tid: 775,
      ts: 308559814315,
      args: {
        data: {
          had_recent_input,
          impacted_nodes: impactedNodes,
          score: score,
        },
        frame: '3C4CBF06AF1ED5B9EAA59BECA70111F4',
      },
    };
  }

  function makeAnimationTraceEvent(id, nodeId) {
    return {
      args: {
        data: {
          id,
          name: '',
          nodeId,
          nodeName: 'DIV',
          state: 'running',
        },
      },
      cat: 'blink.animations,devtools.timeline,benchmark,rail',
      id2: {
        local: '0x363db876c8',
      },
      name: 'Animation',
      ph: 'b',
      pid: 34054,
      scope: 'blink.animations,devtools.timeline,benchmark,rail',
      tid: 775,
      ts: 35506271512,
    };
  }

  /**
   * @param {Array<{nodeId: number, score: number}>} shiftScores
   */
  function sumScores(shiftScores) {
    let sum = 0;
    shiftScores.forEach(shift => sum += shift.score);
    return sum;
  }

  function expectEqualFloat(actual, expected) {
    const diff = Math.abs(actual - expected);
    expect(diff).toBeLessThanOrEqual(Number.EPSILON);
  }

  it('returns layout shift data sorted by impact area', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 60,
          old_rect: [0, 0, 200, 100],
        },
        {
          new_rect: [0, 300, 200, 200],
          node_id: 25,
          old_rect: [0, 100, 200, 100],
        },
      ]),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 25, score: 0.6},
      {nodeId: 60, score: 0.4},
    ]);
    const total = sumScores(result);
    expectEqualFloat(total, 1.0);
  });

  it('does not ignore initial trace events with input', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 1,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 2,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 1, score: 1},
      {nodeId: 2, score: 1},
    ]);
  });

  it('does ignore later trace events with input', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 1,
          old_rect: [0, 0, 200, 100],
        },
      ]),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 2,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 1, score: 1},
    ]);
  });

  it('correctly ignores trace events with input (complex)', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 1,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 2,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 3,
          old_rect: [0, 0, 200, 100],
        },
      ]),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 4,
          old_rect: [0, 0, 200, 100],
        },
      ]),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 5,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 6,
          old_rect: [0, 0, 200, 100],
        },
      ], true),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 7,
          old_rect: [0, 0, 200, 100],
        },
      ]),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 1, score: 1},
      {nodeId: 2, score: 1},
      {nodeId: 3, score: 1},
      {nodeId: 4, score: 1},
      {nodeId: 7, score: 1},
    ]);
  });

  it('combines scores for the same nodeId accross multiple shift events', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 0, 200, 200],
          node_id: 60,
          old_rect: [0, 0, 200, 100],
        },
        {
          new_rect: [0, 300, 200, 200],
          node_id: 25,
          old_rect: [0, 100, 200, 100],
        },
      ]),
      makeLayoutShiftTraceEvent(0.3, [
        {
          new_rect: [0, 100, 200, 200],
          node_id: 60,
          old_rect: [0, 0, 200, 200],
        },
      ]),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 60, score: 0.7},
      {nodeId: 25, score: 0.6},
    ]);
    const total = sumScores(result);
    expectEqualFloat(total, 1.3);
  });

  it('returns only the top five values', () => {
    const traceEvents = [
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 100, 100, 100],
          node_id: 1,
          old_rect: [0, 0, 100, 100],
        },
        {
          new_rect: [0, 200, 100, 100],
          node_id: 2,
          old_rect: [0, 100, 100, 100],
        },
      ]),
      makeLayoutShiftTraceEvent(1, [
        {
          new_rect: [0, 100, 200, 200],
          node_id: 3,
          old_rect: [0, 100, 200, 200],
        },
      ]),
      makeLayoutShiftTraceEvent(0.75, [
        {
          new_rect: [0, 0, 100, 50],
          node_id: 4,
          old_rect: [0, 0, 100, 100],
        },
        {
          new_rect: [0, 0, 100, 50],
          node_id: 5,
          old_rect: [0, 0, 100, 100],
        },
        {
          new_rect: [0, 0, 100, 200],
          node_id: 6,
          old_rect: [0, 0, 100, 100],
        },
        {
          new_rect: [0, 0, 100, 200],
          node_id: 7,
          old_rect: [0, 0, 100, 100],
        },
      ]),
    ];

    const result = TraceElementsGatherer.getTopLayoutShiftElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 3, score: 1.0},
      {nodeId: 1, score: 0.5},
      {nodeId: 2, score: 0.5},
      {nodeId: 6, score: 0.25},
      {nodeId: 7, score: 0.25},
    ]);
    const total = sumScores(result);
    expectEqualFloat(total, 2.5);
  });

  it('gets animated node ids without duplicates', () => {
    const traceEvents = [
      makeAnimationTraceEvent('1', 5),
      makeAnimationTraceEvent('2', 5),
      makeAnimationTraceEvent('3', 6),
    ];

    const result = TraceElementsGatherer.getAnimatedElements(traceEvents);
    expect(result).toEqual([
      {nodeId: 5},
      {nodeId: 6},
    ]);
  });
});
