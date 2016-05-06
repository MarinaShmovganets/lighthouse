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

/* eslint-env mocha */

const pkg = require('../../package.json');
const assert = require('assert');
const path = require('path');

describe('Module Tests', function() {
  const VALID_TEST_URL = 'https://www.moji-brush.com';

  it('should have a main defined in the package.json', function() {
    assert.ok(pkg.main);
  });

  it('should be able to require in the pacakge.json\'s main file', function() {
    const lighthouse = require(path.join('..', '..', pkg.main));
    assert.ok(lighthouse);
  });

  it('should require lighthouse as a function', function() {
    const lighthouse = require(path.join('..', '..', pkg.main));
    assert.ok(typeof lighthouse === 'function');
  });

  it('should be able to run lighthouse with just a url', function() {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse(VALID_TEST_URL)
    .then(results => {
      assert.ok(results);
    });
  });

  it('should be able to run lighthouse with just a url and options', function() {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse(VALID_TEST_URL, {})
    .then(results => {
      assert.ok(results);
    });
  });

  it('should throw an error when the first parameter is not defined', function(cb) {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse()
    .then(() => {
      assert.error(new Error('Should not have resolved when first arg is not a string'));
    })
    .catch(err => {
      assert.ok(err);
    })
    .then(cb);
  });

  it('should throw an error when the first parameter is an empty string', function(cb) {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse()
    .then(() => {
      assert.error(new Error('Should not have resolved when first arg is not a string'));
    })
    .catch(err => {
      assert.ok(err);
    })
    .then(cb);
  });

  it('should throw an error when the first parameter is not a string', function(cb) {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse({})
    .then(() => {
      assert.error(new Error('Should not have resolved when first arg is not a string'));
    })
    .catch(err => {
      assert.ok(err);
    })
    .then(cb);
  });

  it('should throw an error when the second parameter is not an object', function(cb) {
    const lighthouse = require(path.join('..', '..', pkg.main));
    return lighthouse(VALID_TEST_URL, [])
    .then(() => {
      assert.error(new Error('Should not have resolved when first arg is not a string'));
    })
    .catch(err => {
      assert.ok(err);
    })
    .then(cb);
  });
});
