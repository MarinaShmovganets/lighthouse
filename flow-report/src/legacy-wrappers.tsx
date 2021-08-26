/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useMemo} from 'preact/hooks';
import {CategoryRenderer} from '../../report/renderer/category-renderer';
import {DetailsRenderer} from '../../report/renderer/details-renderer';
import {DOM} from '../../report/renderer/dom';

interface ReportRendererGlobals {
   dom: DOM,
   detailsRenderer: DetailsRenderer,
   categoryRenderer: CategoryRenderer,
}

const ReportRendererContext = createContext<ReportRendererGlobals|undefined>(undefined);

function useReportRenderer() {
  const globals = useContext(ReportRendererContext);
  if (!globals) throw Error('Globals not defined');
  return globals;
}

export const LegacyRendererWrapper: FunctionComponent = ({children}) => {
  const globals = useMemo(() => {
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    return {
      dom,
      detailsRenderer,
      categoryRenderer,
    };
  }, []);
  return (
    <ReportRendererContext.Provider value={globals}>{children}</ReportRendererContext.Provider>
  );
};

export const LegacyGauge: FunctionComponent<{category: LH.ReportResult.Category, href: string}> =
({category, href}) => {
  const {categoryRenderer} = useReportRenderer();
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
