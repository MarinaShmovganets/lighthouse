/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';
import {CategoryRenderer} from '../../report/renderer/category-renderer';
import {DetailsRenderer} from '../../report/renderer/details-renderer';
import {DOM} from '../../report/renderer/dom';
import {ReportRendererContext} from './legacy-wrappers';
import {Sidebar} from './sidebar/sidebar';
import {Summary} from './summary/summary';
import {FlowResultContext, useCurrentLhr} from './util';

const Report: FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  // TODO(FR-COMPAT): Render an actual report here.
  return (
    <div data-testid="Report">
      <h1>{lhr.finalUrl}</h1>
      {
        Object.values(lhr.categories).map((category) =>
          <h2 key={category.id}>{category.id}: {category.score}</h2>
        )
      }
    </div>
  );
};

const Content: FunctionComponent = () => {
  const currentLhr = useCurrentLhr();
  return currentLhr ? <Report lhr={currentLhr.value}/> : <Summary/>;
};

export const App: FunctionComponent<{flowResult: LH.FlowResult}> = ({flowResult}) => {
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
    <FlowResultContext.Provider value={flowResult}>
      <ReportRendererContext.Provider value={globals}>
        <div className="App">
          <Sidebar/>
          <Content/>
        </div>
      </ReportRendererContext.Provider>
    </FlowResultContext.Provider>
  );
};
