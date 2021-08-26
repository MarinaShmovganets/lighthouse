/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useMemo} from 'preact/hooks';
import type {DOM} from '../../report/renderer/dom';
import type {DetailsRenderer} from '../../report/renderer/details-renderer';
import type {CategoryRenderer} from '../../report/renderer/category-renderer';

interface ReportRendererGlobals {
   dom: DOM,
   detailsRenderer: DetailsRenderer,
   categoryRenderer: CategoryRenderer,
}

export const ReportRendererContext = createContext<ReportRendererGlobals|undefined>(undefined);

function useLhGlobals() {
  const globals = useContext(ReportRendererContext);
  if (!globals) throw Error('Globals not defined');
  return globals;
}

export const LegacyGauge: FunctionComponent<{category: LH.ReportResult.Category, href: string}> =
({category, href}) => {
  const {categoryRenderer} = useLhGlobals();
  const gauge = useMemo(() => {
    const el = categoryRenderer.renderScoreGauge(category, {});
    const anchor = el.querySelector('a') as HTMLAnchorElement;
    if (anchor) anchor.href = href;

    // Category label is displayed in the navigation header.
    const label = el.querySelector('.lh-gauge__label');
    if (label) label.remove();

    return el;
  }, [categoryRenderer]);
  return <div ref={e => e && e.appendChild(gauge)} data-testid="Gauge"></div>;
};
