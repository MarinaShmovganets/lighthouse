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

const Printer = require('../../cli/printer.js');
const assert = require('assert');
const fs = require('fs');
const sampleResults = require('../results/sample.json');

/* global describe, it, beforeEach */

describe('Printer', () => {
  beforeEach(() => {
    this.printer = new Printer();
  });

  it('has valid output modes', () => {
    assert.ok(Printer._outputModes.indexOf('html') !== -1);
    assert.ok(Printer._outputModes.indexOf('json') !== -1);
    assert.ok(Printer._outputModes.indexOf('pretty') !== -1);
  });

  it('accepts valid output modes', () => {
    this.printer.outputMode = 'json';
    assert.ok(this.printer.outputMode === 'json');
  });

  it('rejects invalid output modes', () => {
    this.printer.outputMode = 'bacon';
    assert.ok(this.printer.outputMode !== 'bacon');
  });

  it('accepts valid output paths', () => {
    this.printer.outputPath = '/path/to/output';
    assert.ok(this.printer.outputPath === '/path/to/output');
  });

  it('rejects invalid output paths', () => {
    this.printer.outputMode = undefined;
    assert.ok(this.printer.outputMode !== undefined);
  });

  it('creates JSON for results', () => {
    this.printer.outputMode = 'json';
    return this.printer.createOutput(sampleResults).then(json => {
      assert.doesNotThrow(_ => JSON.parse(json));
    });
  });

  it('creates Pretty Printed results', () => {
    this.printer.outputMode = 'pretty';
    return this.printer.createOutput(sampleResults).then(text => {
      // Just check there's no HTML / JSON there.
      assert.throws(_ => JSON.parse(text));
      assert.notEqual(/<!doctype/gim.test(text), true);
    });
  });

  it('creates HTML for results', () => {
    this.printer.outputMode = 'html';
    return this.printer.createOutput(sampleResults).then(html => {
      assert.ok(/<!doctype/gim.test(html));
    });
  });

  it('writes file for results', () => {
    let html = '';
    this.printer.outputMode = 'html';
    this.printer.outputPath = './file.html';

    this.printer.createOutput(sampleResults)
      .then(output => {
        html = output;
      })
      .then(_ => {
        // Now do a second pass where the file is written out.
        return this.printer.write(sampleResults).then(_ => {
          const fileContents = fs.readFileSync('./file.html');
          fs.unlinkSync('./file.html');
          assert.ok(fileContents === html);
        });
      });
  });

  it('throws for invalid paths', () => {
    this.printer.outputMode = 'html';
    this.printer.outputPath = '!/#@.html';
    return this.printer.write(sampleResults).then(_ => {
      // If the then is called, something went askew.
      assert.ok(false);
    })
    .catch(err => {
      assert.ok(err.code === 'ENOENT');
    });
  });
});
