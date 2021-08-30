/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';
import {Separator} from '../common';
import {classNames, useCurrentLhr, useFlowResult, useLocale} from '../util';
import {SidebarFlow} from './flow';

export const SidebarSummary: FunctionComponent = () => {
  const currentLhr = useCurrentLhr();
  const url = new URL(location.href);
  url.hash = '#';
  return (
    <a
      href={url.href}
      className={classNames('SidebarSummary', {'Sidebar--current': currentLhr === null})}
      data-testid="SidebarSummary"
    >
      <div className="SidebarSummary__icon">
        <svg width="14" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2C0 1.17 0.67 0.5 1.5 0.5C2.33 0.5 3 1.17 3 2C3 2.83 2.33 3.5 1.5 3.5C0.67 3.5 0 2.83 0 2ZM0 8C0 7.17 0.67 6.5 1.5 6.5C2.33 6.5 3 7.17 3 8C3 8.83 2.33 9.5 1.5 9.5C0.67 9.5 0 8.83 0 8ZM1.5 12.5C0.67 12.5 0 13.18 0 14C0 14.82 0.68 15.5 1.5 15.5C2.32 15.5 3 14.82 3 14C3 13.18 2.33 12.5 1.5 12.5ZM18 15H5V13H18V15ZM5 9H18V7H5V9ZM5 3V1H18V3H5Z" fill="currentColor"/>
        </svg>
      </div>
      <div className="SidebarSummary__label">Summary</div>
    </a>
  );
};

const SidebarRuntimeSettings: FunctionComponent<{settings: LH.ConfigSettings}> = ({settings}) => {
  return (
    <details className="SidebarRuntimeSettings">
      <summary>
        {
          `${settings.screenEmulation.height}x${settings.screenEmulation.width}px | ` +
          `${settings.formFactor}`
        }
      </summary>
      <div>Emulated user agent: {settings.emulatedUserAgent}</div>
      <div>Channel: {settings.channel}</div>
    </details>
  );
};

export const SidebarHeader: FunctionComponent<{title: string, date: string}> = ({title, date}) => {
  const locale = useLocale();
  const formatter = useMemo(() => {
    const options:Intl.DateTimeFormatOptions = {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
    };
    return new Intl.DateTimeFormat(locale, options);
  }, [locale]);
  const dateString = useMemo(() => formatter.format(new Date(date)), [date, formatter]);
  return (
    <div className="SidebarHeader">
      <div className="SidebarHeader__title">{title}</div>
      <div className="SidebarHeader__date">{dateString}</div>
    </div>
  );
};

export const Sidebar: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const firstLhr = flowResult.lhrs[0];
  return (
    <div className="Sidebar">
      <SidebarHeader title="Lighthouse User Flow Report" date={firstLhr.fetchTime}/>
      <Separator/>
      <SidebarSummary/>
      <Separator/>
      <SidebarFlow/>
      <Separator/>
      <SidebarRuntimeSettings settings={firstLhr.configSettings}/>
    </div>
  );
};
