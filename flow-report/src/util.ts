/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext} from 'preact';
import {useContext, useEffect, useMemo, useState} from 'preact/hooks';

import type {UIStringsType} from './i18n/ui-strings';

export const FlowResultContext = createContext<LH.FlowResult|undefined>(undefined);

function getHashParam(param: string): string|null {
  const params = new URLSearchParams(location.hash.replace('#', '?'));
  return params.get(param);
}

export function classNames(...args: Array<string|undefined|Record<string, boolean>>): string {
  const classes = [];
  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string') {
      classes.push(arg);
      continue;
    }

    const applicableClasses = Object.entries(arg)
      .filter(([_, shouldApply]) => shouldApply)
      .map(([className]) => className);
    classes.push(...applicableClasses);
  }

  return classes.join(' ');
}

export function getScreenDimensions(reportResult: LH.Result) {
  const {width, height} = reportResult.configSettings.screenEmulation;
  return {width, height};
}

export function getFullPageScreenshot(reportResult: LH.Result) {
  const fullPageScreenshotAudit = reportResult.audits['full-page-screenshot'];
  const fullPageScreenshot =
    fullPageScreenshotAudit &&
    fullPageScreenshotAudit.details &&
    fullPageScreenshotAudit.details.type === 'full-page-screenshot' &&
    fullPageScreenshotAudit.details;

  return fullPageScreenshot || null;
}

export function getFilmstripFrames(
  reportResult: LH.Result
): Array<{data: string}> | undefined {
  const filmstripAudit = reportResult.audits['screenshot-thumbnails'];
  if (!filmstripAudit) return undefined;

  const frameItems =
    filmstripAudit.details &&
    filmstripAudit.details.type === 'filmstrip' &&
    filmstripAudit.details.items;

  return frameItems || undefined;
}

export function getModeDescription(mode: LH.Result.GatherMode, strings: UIStringsType) {
  switch (mode) {
    case 'navigation': return strings.navigationDescription;
    case 'timespan': return strings.timespanDescription;
    case 'snapshot': return strings.snapshotDescription;
  }
}

export function useFlowResult(): LH.FlowResult {
  const flowResult = useContext(FlowResultContext);
  if (!flowResult) throw Error('useFlowResult must be called in the FlowResultContext');
  return flowResult;
}

export function useHashParams(...params: string[]) {
  const [paramValues, setParamValues] = useState(params.map(getHashParam));

  // Use two-way-binding on the URL hash.
  // Triggers a re-render if any param changes.
  useEffect(() => {
    function hashListener() {
      const newParamValues = params.map(getHashParam);
      if (newParamValues.every((value, i) => value === paramValues[i])) return;
      setParamValues(newParamValues);
    }
    window.addEventListener('hashchange', hashListener);
    return () => window.removeEventListener('hashchange', hashListener);
  }, [paramValues]);

  return paramValues;
}

export function useHashState(): LH.FlowResult.HashState|null {
  const flowResult = useFlowResult();
  const [indexString, anchor] = useHashParams('index', 'anchor');

  // Memoize result so a new object is not created on every call.
  return useMemo(() => {
    if (!indexString) return null;

    const index = Number(indexString);
    if (!Number.isFinite(index)) {
      console.warn(`Invalid hash index: ${indexString}`);
      return null;
    }

    const step = flowResult.steps[index];
    if (!step) {
      console.warn(`No flow step at index ${index}`);
      return null;
    }

    return {currentLhr: step.lhr, index, anchor};
  }, [indexString, flowResult, anchor]);
}
