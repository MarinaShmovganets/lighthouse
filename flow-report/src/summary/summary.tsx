/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';

import {FlowSegment, FlowStepThumbnail, Separator} from '../common';
import {getModeDescription, useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';
import {SummaryCategory} from './category';
import {useUIStrings} from '../i18n/i18n';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const THUMBNAIL_WIDTH = 50;

const SummaryNavigationHeader: FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  return (
    <div className="SummaryNavigationHeader" data-testid="SummaryNavigationHeader">
      <FlowSegment/>
      <div className="SummaryNavigationHeader__url">{lhr.finalUrl}</div>
      <div className="SummaryNavigationHeader__category">
        {lhr.categories['performance'].title}
      </div>
      <div className="SummaryNavigationHeader__category">
        {lhr.categories['accessibility'].title}
      </div>
      <div className="SummaryNavigationHeader__category">
        {lhr.categories['best-practices'].title}
      </div>
      <div className="SummaryNavigationHeader__category">
        {lhr.categories['seo'].title}
      </div>
    </div>
  );
};

/**
 * The div should behave like a JSX <>...</>. This still allows us to identify "rows" with CSS selectors.
 */
export const SummaryFlowStep: FunctionComponent<{
  lhr: LH.Result,
  label: string,
  hashIndex: number,
}> = ({lhr, label, hashIndex}) => {
  const reportResult = useMemo(() => Util.prepareReportResult(lhr), [lhr]);
  const strings = useUIStrings();
  const modeDescription = getModeDescription(lhr.gatherMode, strings);

  return (
    <div className="SummaryFlowStep">
      {
        lhr.gatherMode === 'navigation' || hashIndex === 0 ?
          <SummaryNavigationHeader lhr={lhr}/> :
          <div className="SummaryFlowStep__separator">
            <FlowSegment/>
            <Separator/>
          </div>
      }
      {
        lhr.gatherMode !== 'timespan' &&
          <FlowStepThumbnail reportResult={reportResult} width={THUMBNAIL_WIDTH}/>
      }
      <FlowSegment mode={lhr.gatherMode}/>
      <div className="SummaryFlowStep__label">
        <div className="SummaryFlowStep__mode">{modeDescription}</div>
        <a className="SummaryFlowStep__link" href={`#index=${hashIndex}`}>{label}</a>
      </div>
      {
        DISPLAYED_CATEGORIES.map(c => (
          <SummaryCategory
            key={c}
            category={reportResult.categories[c]}
            href={`#index=${hashIndex}&anchor=${c}`}
            gatherMode={lhr.gatherMode}
          />
        ))
      }
    </div>
  );
};

/**
 * For the summary flow, there are many different cells with different contents and different display properties.
 * CSS grid makes it easier to enforce things like content alignment and column width (e.g. all category columns have the same width).
 */
const SummaryFlow: FunctionComponent = () => {
  const flowResult = useFlowResult();
  return (
    <div className="SummaryFlow">
      {
        flowResult.steps.map((step, index) =>
          <SummaryFlowStep
            key={step.lhr.fetchTime}
            lhr={step.lhr}
            label={step.name}
            hashIndex={index}
          />
        )
      }
    </div>
  );
};

export const SummaryHeader: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const strings = useUIStrings();

  let numNavigation = 0;
  let numTimespan = 0;
  let numSnapshot = 0;
  for (const step of flowResult.steps) {
    switch (step.lhr.gatherMode) {
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
      <div className="SummaryHeader__title">{strings.summary}</div>
      <div className="SummaryHeader__subtitle">{subtitle}</div>
    </div>
  );
};

const SummarySectionHeader: FunctionComponent = ({children}) => {
  return (
    <div className="SummarySectionHeader">
      <div className="SummarySectionHeader__content">{children}</div>
      <Separator/>
    </div>
  );
};

export const Summary: FunctionComponent = () => {
  const strings = useUIStrings();

  return (
    <div className="Summary" data-testid="Summary">
      <SummaryHeader/>
      <Separator/>
      <SummarySectionHeader>{strings.allReports}</SummarySectionHeader>
      <SummaryFlow/>
    </div>
  );
};
