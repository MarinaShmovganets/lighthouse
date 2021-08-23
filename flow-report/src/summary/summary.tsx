/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {Gauge} from '../lh-wrappers';
import {useFlowResult} from '../util';
import {Util} from '../../../report/renderer/util';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const NullGauge: FunctionComponent = () => <h1>-</h1>;

const SummaryFlowStep: FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  const reportResult = Util.prepareReportResult(lhr);
  return <div className="SummaryFlowStep">
    <div>{reportResult.finalUrl}</div>
    {
      DISPLAYED_CATEGORIES.map(c => (
        reportResult.categories[c] ?
          <Gauge category={reportResult.categories[c]}></Gauge> :
          <NullGauge/>
      ))
    }
  </div>;
};

export const Summary: FunctionComponent = () => {
  const flowResult = useFlowResult();
  return <div className="Summary">
    {
      flowResult.lhrs.map(lhr => <SummaryFlowStep lhr={lhr}/>)
    }
  </div>;
};
