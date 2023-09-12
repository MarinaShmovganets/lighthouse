/**
 * @license
 * Copyright 2021 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

declare module '@stadtlandnetz/rollup-plugin-postprocess' {
  function postprocess(args: Array<[RegExp, string]>): void;
  export = postprocess;
}
