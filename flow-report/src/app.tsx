/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useEffect, useLayoutEffect, useRef, useState} from 'preact/hooks';

import {ReportRendererProvider} from './wrappers/report-renderer';
import {Sidebar} from './sidebar/sidebar';
import {Summary} from './summary/summary';
import {classNames, FlowResultContext, useHashState} from './util';
import {Report} from './wrappers/report';
import {Topbar} from './topbar';
import {Header} from './header';
import {I18nProvider} from './i18n/i18n';

function getAnchorElement(hashState: LH.FlowResult.HashState|null) {
  if (!hashState || !hashState.anchor) return null;
  return document.getElementById(hashState.anchor);
}

const Content: FunctionComponent = () => {
  const hashState = useHashState();
  const ref = useRef<HTMLDivElement>(null);

  // Scroll to top if no anchor is found.
  // Done with `useLayoutEffect` to prevent a flash of the destination scrolled down.
  useLayoutEffect(() => {
    const el = getAnchorElement(hashState);
    if (ref.current && !el) ref.current.scrollTop = 0;
  }, [hashState]);

  // Scroll to anchor element if it is found.
  // Done with `useEffect` to prevent a bug where Chrome scrolls too far.
  useEffect(() => {
    const el = getAnchorElement(hashState);
    if (el) el.scrollIntoView({behavior: 'smooth'});
  }, [hashState]);

  return (
    <div ref={ref} className="Content">
      {
        hashState ?
          <>
            <Header hashState={hashState}/>
            <Report hashState={hashState}/>
          </> :
          <Summary/>
      }
    </div>
  );
};

export const App: FunctionComponent<{flowResult: LH.FlowResult}> = ({flowResult}) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <FlowResultContext.Provider value={flowResult}>
      <ReportRendererProvider>
        <I18nProvider>
          <div className={classNames('App', {'App--collapsed': collapsed})} data-testid="App">
            <Topbar onMenuClick={() => setCollapsed(c => !c)} />
            <Sidebar/>
            <Content/>
          </div>
        </I18nProvider>
      </ReportRendererProvider>
    </FlowResultContext.Provider>
  );
};
