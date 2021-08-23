/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {Gauge} from '../lh-wrappers';
import {FlowStepIcon} from '../sidebar/flow';
import {useDerivedStepNames, useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const NullGauge: FunctionComponent = () => <h1>-</h1>;

const SummaryFlowIcon: FunctionComponent<{
  hideTopLine: boolean,
  hideBottomLine: boolean,
  mode?: LH.Result.GatherMode
}> = ({mode, hideBottomLine, hideTopLine}) => {
  return (
    <div className="SummaryFlowIcon">
      <div
        className="SummaryFlowIcon__line"
        style={hideTopLine ? {background: 'transparent'} : undefined}
      />
      {
        mode && <FlowStepIcon mode={mode}/>
      }
      <div
        className="SummaryFlowIcon__line"
        style={hideBottomLine ? {background: 'transparent'} : undefined}
      />
    </div>
  );
};

const SummaryNavigationHeader: FunctionComponent<{url: string}> =
({url}) => {
  return (
    <div className="SummaryNavigationHeader">
      <div className="SummaryNavigationHeader__url">{url}</div>
      <div className="SummaryNavigationHeader__category">Performance</div>
      <div className="SummaryNavigationHeader__category">Accessibility</div>
      <div className="SummaryNavigationHeader__category">Best Practices</div>
      <div className="SummaryNavigationHeader__category">SEO</div>
    </div>
  );
};

const SummaryFlowStep: FunctionComponent<{
  lhr: LH.Result,
  label: string,
  hashIndex: number,
  hideTopLine: boolean,
  hideBottomLine: boolean,
}> =
({lhr, label, hashIndex, hideBottomLine, hideTopLine}) => {
  const reportResult = Util.prepareReportResult(lhr);
  const screenshotAudit = reportResult.audits['screenshot-thumbnails'];
  const screenshots =
    screenshotAudit &&
    screenshotAudit.details &&
    screenshotAudit.details.type === 'filmstrip' &&
    screenshotAudit.details.items;
  const lastScreenshot = screenshots && screenshots[screenshots.length - 1];
  return <>
    {
      lhr.gatherMode === 'navigation' ?
        <SummaryNavigationHeader url={lhr.finalUrl}/> :
        undefined
    }
    <div className="SummaryFlowStep">
      <img className="SummaryFlowStep__screenshot" src={lastScreenshot ? lastScreenshot.data : ''}/>
      <SummaryFlowIcon
        mode={lhr.gatherMode}
        hideBottomLine={hideBottomLine}
        hideTopLine={hideTopLine}
      />
      <a className="SummaryFlowStep__label" href={`#index=${hashIndex}`}>{label}</a>
      {
        DISPLAYED_CATEGORIES.map(c => (
          reportResult.categories[c] ?
            // TODO(FR-COMPAT): jump to category specific anchor.
            <Gauge key={c} category={reportResult.categories[c]} href={`#index=${hashIndex}`}/> :
            <NullGauge key={c}/>
        ))
      }
    </div>
    <div className="SummaryFlowStep__divider">
      <SummaryFlowIcon hideTopLine={hideBottomLine} hideBottomLine={hideBottomLine}/>
      <div className="SummaryFlowStep__divider--line"/>
    </div>
  </>;
};

export const Summary: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const stepNames = useDerivedStepNames();
  return <div className="Summary">
    {
      flowResult.lhrs.map((lhr, index) =>
        <SummaryFlowStep
          key={lhr.fetchTime}
          lhr={lhr}
          label={stepNames[index]}
          hashIndex={index}
          hideTopLine={index === 0}
          hideBottomLine={index === flowResult.lhrs.length - 1}
        />
      )
    }
  </div>;
};
