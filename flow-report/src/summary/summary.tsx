/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {Gauge} from '../lh-wrappers';
import {useDerivedStepNames, useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const NullGauge: FunctionComponent = () => <h1>-</h1>;

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

const SummaryFlowStep: FunctionComponent<{lhr: LH.Result, label: string, hashIndex: number}> =
({lhr, label, hashIndex}) => {
  const reportResult = Util.prepareReportResult(lhr);
  return <>
    {
      lhr.gatherMode === 'navigation' ?
        <SummaryNavigationHeader url={lhr.finalUrl}/> :
        undefined
    }
    <div className="SummaryFlowStep">
      <a className="SummaryFlowStep__label" href={`#index=${hashIndex}`}>{label}</a>
      {
        DISPLAYED_CATEGORIES.map(c => (
          reportResult.categories[c] ?
            // TODO(FR-COMPAT): jump to category specific anchor.
            <Gauge category={reportResult.categories[c]} href={`#index=${hashIndex}`}/> :
            <NullGauge/>
        ))
      }
    </div>
  </>;
};

export const Summary: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const stepNames = useDerivedStepNames();
  return <div className="Summary">
    {
      flowResult.lhrs.map((lhr, index) =>
        <SummaryFlowStep lhr={lhr} label={stepNames[index]} hashIndex={index}/>
      )
    }
  </div>;
};
