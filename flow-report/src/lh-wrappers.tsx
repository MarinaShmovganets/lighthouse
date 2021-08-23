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

interface LhGlobals {
   dom: DOM,
   detailsRenderer: DetailsRenderer,
   categoryRenderer: CategoryRenderer,
}

export const LhContext = createContext<LhGlobals|undefined>(undefined);

function useLhGlobals() {
  const globals = useContext(LhContext);
  if (!globals) throw Error('Globals not defined');
  return globals;
}

export const Gauge: FunctionComponent<{category: LH.ReportResult.Category}> = ({category}) => {
  const {categoryRenderer} = useLhGlobals();
  const gauge = useMemo(() => {
    return categoryRenderer.renderScoreGauge(category, {});
  }, [categoryRenderer]);
  return <div ref={e => e && e.appendChild(gauge)}></div>;
};
