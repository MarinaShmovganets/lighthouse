/**
 * @license
 * Copyright 2018 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'metaviewport-parser' {
  export function parseMetaViewPortContent(S: string): {
    validProperties: {[p: string]: number | string},
    unknownProperties: {[p: string]: number | string},
    invalidValues: {[p: string]: number | string};
  };
}
