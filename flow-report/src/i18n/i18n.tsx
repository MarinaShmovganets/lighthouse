/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useEffect, useMemo} from 'preact/hooks';

import {I18n} from '../../../report/renderer/i18n';
import {UIStrings} from './ui-strings';
import {useFlowResult} from '../util';
import strings from './localized-strings';
import {Util} from '../../../report/renderer/util';

type LhrStrings = typeof Util.UIStrings;
type FlowStrings = typeof UIStrings;

const I18nContext = createContext<I18n<LhrStrings & FlowStrings> | undefined>(undefined);

export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw Error('i18n was not initialized');
  return i18n;
}

export function useUIStrings() {
  const i18n = useI18n();
  return i18n.strings;
}

export const I18nProvider: FunctionComponent = ({children}) => {
  const flowResult = useFlowResult();
  const firstLhr = flowResult.steps[0].lhr;
  const lhrStrings = firstLhr.i18n.rendererFormattedStrings as LhrStrings;
  const locale = firstLhr.configSettings.locale;

  useEffect(() => {
    if (flowResult.steps.some(step => step.lhr.configSettings.locale !== locale)) {
      console.warn('LHRs do not have consistent locale');
    }
  }, [flowResult]);

  const i18n = useMemo(() => {
    const i18n = new I18n(locale, {
      // Set missing lhr strings to default (english) values.
      ...Util.UIStrings,
      // Preload with strings from the first lhr.
      ...lhrStrings,
      // Set missing flow strings to default (english) values.
      ...UIStrings,
      // `strings` is generated in build/build-report.js
      ...strings[locale],
    });
    // Initialize renderer util i18n for strings rendered in wrapped components.
    Util.i18n = i18n;
    return i18n;
  }, [locale, lhrStrings]);

  return (
    <I18nContext.Provider value={i18n}>
      {children}
    </I18nContext.Provider>
  );
};


