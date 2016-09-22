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
const Audit = require('../../../audits/dobetterweb/no-websql.js');
const assert = require('assert');

/* eslint-env mocha */

describe('No websql audit', () => {
  it('fails gracefully', () => {
    const auditResult = Audit.audit({});
    assert.equal(auditResult.rawValue, -1);
    assert.equal(auditResult.debugString, '');
  });

  it('passes when no database is created', () => {
    assert.equal(Audit.audit({WebSQL: {database: null}}).rawValue, true);
  });

  it('fails when database is created', () => {
    const auditResult = Audit.audit({
      WebSQL: {database: 'db-name', version: 1.0}
    });

    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.displayValue.match(/db name: (.*), version: (.*)/));
  });
});
