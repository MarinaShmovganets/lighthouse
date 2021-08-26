/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {Gauge} from '../wrappers/gauge';
import {CategoryRatio, FlowStepIcon} from '../common';
import {getScreenDimensions, getScreenshot, useDerivedStepNames, useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';
import {useMemo} from 'preact/hooks';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const THUMBNAIL_WIDTH = 50;

const SummaryNavigationHeader: FunctionComponent<{url: string}> = ({url}) => {
  return (
    <div className="SummaryNavigationHeader" data-testid="SummaryNavigationHeader">
      <FlowStepIcon/>
      <div className="SummaryNavigationHeader__url">{url}</div>
      <div className="SummaryNavigationHeader__category">Performance</div>
      <div className="SummaryNavigationHeader__category">Accessibility</div>
      <div className="SummaryNavigationHeader__category">Best Practices</div>
      <div className="SummaryNavigationHeader__category">SEO</div>
    </div>
  );
};

const SummaryCategory: FunctionComponent<{
  gatherMode: LH.Result.GatherMode,
  audits: LH.ReportResult['audits'],
  category: LH.ReportResult.Category|undefined,
  href: string,
}> = ({gatherMode, audits, category, href}) => {
  return (
    <div className="SummaryCategory">
      {
        category ?
          (
            gatherMode === 'navigation' ?
            <Gauge
              category={category}
              href={href}
            /> :
            <CategoryRatio
              category={category}
              audits={audits}
              href={href}
            />
          ) :
          <div
            className="SummaryCategory__null"
            data-testid="SummaryCategory__null"
          />
      }
    </div>
  );
};

export const SummaryFlowStep: FunctionComponent<{
  lhr: LH.Result,
  label: string,
  hashIndex: number,
}> = ({lhr, label, hashIndex}) => {
  // TODO(FR-COMPAT): Store report results globally.
  const reportResult = useMemo(() => Util.prepareReportResult(lhr), [lhr]);

  const screenshot = reportResult.gatherMode !== 'timespan' ? getScreenshot(reportResult) : null;

  // Crop the displayed image to the viewport dimensions.
  const {width, height} = getScreenDimensions(reportResult);
  const thumbnailHeight = height * THUMBNAIL_WIDTH / width;

  return (
    <div className="SummaryFlowStep">
      {
        lhr.gatherMode === 'navigation' || hashIndex === 0 ?
          <SummaryNavigationHeader url={lhr.finalUrl}/> :
          <div className="SummaryFlowStep__divider">
            <FlowStepIcon/>
            <div className="SummaryFlowStep__divider--line"/>
          </div>
      }
      <img
        className="SummaryFlowStep__screenshot"
        data-testid="SummaryFlowStep__screenshot"
        src={screenshot || undefined}
        style={{width: THUMBNAIL_WIDTH, maxHeight: thumbnailHeight}}
      />
      <FlowStepIcon mode={lhr.gatherMode}/>
      <a className="SummaryFlowStep__label" href={`#index=${hashIndex}`}>{label}</a>
      {
        DISPLAYED_CATEGORIES.map(c => (
          <SummaryCategory
            key={c}
            gatherMode={reportResult.gatherMode}
            category={reportResult.categories[c]}
            audits={reportResult.audits}
            href={`#index=${hashIndex}&anchor=${c}`}
          />
        ))
      }
    </div>
  );
};

const SummaryFlow: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const stepNames = useDerivedStepNames();
  return (
    <div className="SummaryFlow">
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
    </div>
  );
};

export const SummaryHeader: FunctionComponent = () => {
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

  // TODO(FR-COMPAT): Pluralize UI strings.
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
