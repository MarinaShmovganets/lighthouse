/**
 * @license
 * Copyright 2018 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

type Locale = import('../lhr/settings.js').Locale;

declare module 'lookup-closest-locale' {
  function lookupClosestLocale(locale: string[]|string|undefined, available: Record<Locale, any>): Locale|undefined;

  export = lookupClosestLocale;
}
