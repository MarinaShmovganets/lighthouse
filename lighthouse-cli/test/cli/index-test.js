/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const assert = require('assert');
const childProcess = require('child_process');
const path = require('path');
const indexPath = path.resolve(__dirname, '../../index.js');
const spawnSync = childProcess.spawnSync;

describe('CLI Tests', function() {
  it('fails if a url is not provided', () => {
    const ret = spawnSync('node', [indexPath], {encoding: 'utf8'});
    assert.ok(ret.stderr.includes('Please provide a url'));
    assert.equal(ret.status, 1);
  });

  it('should list options via --help', () => {
    const ret = spawnSync('node', [indexPath, '--help'], {encoding: 'utf8'});
    assert.ok(ret.stdout.includes('lighthouse <url>'));
    assert.ok(ret.stdout.includes('For more information on Lighthouse'));
  });

  it('should list all audits without a url and exit immediately after', () => {
    const ret = spawnSync('node', [indexPath, '--list-all-audits'], {encoding: 'utf8'});

    const output = JSON.parse(ret.stdout);
    assert.ok(Array.isArray(output.audits));
    assert.ok(output.audits.length > 0);
  });

  it('accepts just the list-trace-categories flag and exit immediately after', () => {
    const ret = spawnSync('node', [indexPath, '--list-trace-categories'], {encoding: 'utf8'});

    const output = JSON.parse(ret.stdout);
    assert.ok(Array.isArray(output.traceCategories));
    assert.ok(output.traceCategories.length > 0);
  });
});

