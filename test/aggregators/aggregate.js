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
const Aggregate = require('../../aggregators/aggregate');
const assert = require('assert');

/* global describe, it*/

describe('Aggregate', () => {
  it('throws when name is called directly', () => {
    return assert.throws(_ => Aggregate.name,
        'Aggregate name must be overridden');
  });

  it('throws when shortName is called directly', () => {
    return assert.throws(_ => Aggregate.shortName,
        'Aggregate name must be overridden');
  });

  it('throws when criteria is called directly', () => {
    return assert.throws(_ => Aggregate.criteria,
        'Aggregate criteria must be overridden');
  });

  it('filters empty results', () => {
    const a = [];
    const b = {
      c: 1, f: 2, a: 3
    };

    const c = Aggregate._filterResultsByAuditNames(a, b);
    return assert.equal(c.length, 0);
  });

  it('filters results against an empty set', () => {
    const a = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
    const b = {};

    const c = Aggregate._filterResultsByAuditNames(a, b);
    return assert.equal(c.length, 0);
  });

  it('filters results against an expected set', () => {
    const a = [{name: 'a'}, {name: 'b'}, {name: 'c'}];
    const b = {
      c: 1, f: 2, a: 3
    };

    const c = Aggregate._filterResultsByAuditNames(a, b);
    assert.equal(c[0], a[0]);
    return assert.equal(c[1], a[2]);
  });

  it('returns a weight for an empty set', () => {
    const a = {};

    const weight = Aggregate._getTotalWeight(a);
    return assert.equal(weight, 1);
  });

  it('returns a weight of at least 1', () => {
    const a = {
      x: {
        weight: 0
      }
    };

    const weight = Aggregate._getTotalWeight(a);
    return assert.equal(weight, 1);
  });

  it('generates the correct total weight', () => {
    const a = {
      x: {
        weight: 1
      },
      y: {
        weight: 2
      },
      z: {
        weight: 3
      }
    };

    const weight = Aggregate._getTotalWeight(a);
    return assert.equal(weight, 6);
  });

  it('remaps results to an object', () => {
    const a = [{
      name: 'test',
      value: 1
    }, {
      name: 'test-2',
      value: 2
    }, {
      name: 'test-3',
      value: 3
    }];

    const remapped = Aggregate._remapResultsByName(a);
    return assert.deepEqual(remapped, {
      'test': {
        name: 'test',
        value: 1
      },
      'test-2': {
        name: 'test-2',
        value: 2
      },
      'test-3': {
        name: 'test-3',
        value: 3
      }
    });
  });

  it('throws if key already exists during remapping', () => {
    const a = [{
      name: 'test',
      value: 1
    }, {
      name: 'test',
      value: 2
    }];

    return assert.throws(_ => Aggregate._remapResultsByName(a),
      'Cannot remap: test already exists');
  });

  it('returns a weight of zero for undefined inputs', () => {
    return assert.equal(Aggregate._convertToWeight(), 0);
  });

  it('returns a weight of zero for undefined results', () => {
    const expected = {
      value: true,
      weight: 10
    };
    return assert.equal(Aggregate._convertToWeight(undefined, expected), 0);
  });

  it('returns a weight of zero for undefined expectations', () => {
    const result = {
      value: true
    };
    return assert.equal(Aggregate._convertToWeight(result, undefined), 0);
  });

  it('returns the correct weight for a boolean result', () => {
    const expected = {
      value: true,
      weight: 10
    };

    const result = {
      value: true
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 10);
  });

  it('returns the correct weight for a numeric result', () => {
    const expected = {
      value: 100,
      weight: 10
    };

    const result = {
      value: 50
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 5);
  });

  it('returns the a weight of zero if weight is missing from the expected', () => {
    const expected = {
      value: 100
    };

    const result = {
      value: 50
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 0);
  });

  it('returns a weight of zero for other inputs', () => {
    const expected = {
      value: [],
      weight: 10
    };

    const result = {
      value: []
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 0);
  });

  it('returns a weight of zero if types do not match', () => {
    const expected = {
      value: true,
      weight: 10
    };

    const result = {
      value: 20
    };

    return assert.equal(Aggregate._convertToWeight(result, expected), 0);
  });

  it('scores a set correctly', () => {
    const expected = {
      'test': {
        value: true,
        weight: 1
      },
      'alternate-test': {
        value: 100,
        weight: 3
      }
    };

    const results = [{
      name: 'test',
      value: false
    }, {
      name: 'alternate-test',
      value: 50
    }];

    return assert.deepEqual(Aggregate.compare(results, expected), {
      overall: 0.375,
      subItems: [{
        name: 'test',
        value: false
      },
      {
        name: 'alternate-test',
        value: 50
      }]
    });
  });

  it('outputs a score', () => {
    const expected = {
      test: {
        value: true,
        weight: 1
      }
    };

    const results = [{
      name: 'test',
      value: true
    }];

    return assert.equal(Aggregate.compare(results, expected).overall, 1);
  });

  it('outputs subitems', () => {
    const expected = {
      test: {
        value: true,
        weight: 1
      }
    };

    const results = [{
      name: 'test',
      value: true
    }];

    return assert.ok(Array.isArray(Aggregate.compare(results, expected).subItems));
  });
});
