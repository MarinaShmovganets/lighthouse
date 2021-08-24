/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {Gauge} from '../lh-wrappers';
import {CategorySummary, FlowStepIcon} from '../common';
import {useDerivedStepNames, useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const SummaryNavigationHeader: FunctionComponent<{url: string}> =
({url}) => {
  return (
    <div className="SummaryNavigationHeader">
      <FlowStepIcon/>
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
}> =
({lhr, label, hashIndex}) => {
  const reportResult = Util.prepareReportResult(lhr);
  const screenshotAudit = reportResult.audits['screenshot-thumbnails'];
  const screenshots =
    screenshotAudit &&
    screenshotAudit.details &&
    screenshotAudit.details.type === 'filmstrip' &&
    screenshotAudit.details.items;
  const lastScreenshot = screenshots && screenshots[screenshots.length - 1];
  return (
    <div className="SummaryFlowStep">
      {
        lhr.gatherMode === 'navigation' ?
          <SummaryNavigationHeader url={lhr.finalUrl}/> :
          undefined
      }
      <img className="SummaryFlowStep__screenshot" src={lastScreenshot ? lastScreenshot.data : ''}/>
      <FlowStepIcon mode={lhr.gatherMode}/>
      <a className="SummaryFlowStep__label" href={`#index=${hashIndex}`}>{label}</a>
      {
        DISPLAYED_CATEGORIES.map(c => (
          reportResult.categories[c] ?
            reportResult.gatherMode === 'navigation' ?
              <Gauge
                key={c}
                category={reportResult.categories[c]}
                href={`#index=${hashIndex}&anchor=${c}`}
              /> :
              <CategorySummary
                key={c}
                category={reportResult.categories[c]}
                audits={reportResult.audits}
                href={`#index=${hashIndex}&anchor=${c}`}
              /> :
            <div key={c} className="SummaryFlowStep__null-gauge"/>
        ))
      }
      <div className="SummaryFlowStep__divider">
        <FlowStepIcon/>
        <div className="SummaryFlowStep__divider--line"/>
      </div>
    </div>
  );
};

export const SummaryFlow: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const stepNames = useDerivedStepNames();
  return <div className="SummaryFlow">
    {
      flowResult.lhrs.map((lhr, index) =>
        <SummaryFlowStep
          key={lhr.fetchTime}
          lhr={lhr}
          label={stepNames[index]}
          hashIndex={index}
        />
      )
    }
  </div>;
};

const SummaryHeader: FunctionComponent = () => {
  const flowResult = useFlowResult();

  let numNavigation = 0;
  let numTimespan = 0;
  let numSnapshot = 0;
  for (const lhr of flowResult.lhrs) {
    switch (lhr.gatherMode) {
      case 'navigation':
        numNavigation++;
        break;
      case 'timespan':
        numTimespan++;
        break;
      case 'snapshot':
        numSnapshot++;
        break;
    }
  }
  const subtitleCounts = [];
  if (numNavigation) subtitleCounts.push(`${numNavigation} navigation reports`);
  if (numTimespan) subtitleCounts.push(`${numTimespan} timespan reports`);
  if (numSnapshot) subtitleCounts.push(`${numSnapshot} snapshot reports`);
  const subtitle = subtitleCounts.join(' · ');

  return (
    <div className="SummaryHeader">
      <div className="SummaryHeader__title">Summary</div>
      <div className="SummaryHeader__subtitle">{subtitle}</div>
    </div>
  );
};

export const Summary: FunctionComponent = () => {
  return (
    <div className="Summary" data-testid="Summary">
      <SummaryHeader/>
      <SummaryFlow/>
    </div>
  );
};
