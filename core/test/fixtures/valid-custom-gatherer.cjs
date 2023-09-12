/**
 * @license
 * Copyright 2022 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = import('../../gather/base-gatherer.js').then(({default: Gatherer}) => {
  return class CustomGatherer extends Gatherer {};
});
