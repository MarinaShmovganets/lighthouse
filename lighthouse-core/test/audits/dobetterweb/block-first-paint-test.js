/**
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const BlockFirstPaintAudit = require('../../../audits/dobetterweb/block-first-paint.js');
const assert = require('assert');

/* eslint-env mocha */

describe('Block First Paint audit', () => {
  it('fails when no input present', () => {
    const auditResult = BlockFirstPaintAudit.audit({});
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.debugString);
  });

  it('fails when error input present', () => {
    const auditResult = BlockFirstPaintAudit.audit({
      LinkInHead: {
        value: -1
      }
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.debugString);
  });

  it('fails when it found link blocking first paint', () => {
    const auditResult = BlockFirstPaintAudit.audit({
      LinkInHead: {
        each: [{
          url: 'http://google.com/style.css',
          transferSize: 100,
          spendTime: 100
        }],
        total: {
          transferSize: 100,
          spendTime: 100
        }
      }
    });
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.extendedInfo.value.length > 0);
  });

  it('passes when it not found link blocking first paint', () => {
    const auditResult = BlockFirstPaintAudit.audit({
      LinkInHead: {
        each: [],
        total: {
          transferSize: 100,
          spendTime: 100
        }
      }
    });
    assert.equal(auditResult.rawValue, true);
    assert.ok(auditResult.extendedInfo.value.length === 0);
  });
});
