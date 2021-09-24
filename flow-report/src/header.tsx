/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';

import {Util} from '../../report/renderer/util';
import {FlowStepIcon, FlowStepThumbnail} from './common';
import {useFlowResult} from './util';

const SIDE_THUMBNAIL_WIDTH = 40;
const MAIN_THUMBNAIL_WIDTH = 70;

function useAdjacentReportResults(currentLhr: LH.FlowResult.LhrRef) {
  const flowResult = useFlowResult();
  const {value: lhr, index} = currentLhr;
  const prevLhr =
    flowResult.steps[index - 1] && flowResult.steps[index - 1].lhr as LH.Result|undefined;
  const nextLhr =
    flowResult.steps[index + 1] && flowResult.steps[index + 1].lhr as LH.Result|undefined;
  return useMemo(() => {
    const reportResult = Util.prepareReportResult(lhr);
    const prevReportResult = prevLhr && Util.prepareReportResult(prevLhr);
    const nextReportResult = nextLhr && Util.prepareReportResult(nextLhr);
    return {reportResult, prevReportResult, nextReportResult};
  }, [lhr, prevLhr, nextLhr]);
}

const HeaderThumbnail: FunctionComponent<{
  reportResult: LH.ReportResult,
  position: 'prev'|'next'|'main'
}> =
({reportResult, position}) => {
  const width = position === 'main' ? MAIN_THUMBNAIL_WIDTH : SIDE_THUMBNAIL_WIDTH;
  return (
    <div className={`HeaderThumbnail HeaderThumbnail--${position}`}>
      <FlowStepThumbnail reportResult={reportResult} width={width}/>
      <div className="HeaderThumbnail__icon">
        <FlowStepIcon mode={reportResult.gatherMode}/>
      </div>
    </div>
  );
};

const HeaderTimeline: FunctionComponent<{currentLhr: LH.FlowResult.LhrRef}> =
({currentLhr}) => {
  const {reportResult, prevReportResult, nextReportResult} = useAdjacentReportResults(currentLhr);
  return (
    <div className="HeaderTimeline">
      <div className="HeaderTimeline__prev-thumbnail">
        {
          prevReportResult && <>
            <div className="HeaderTimeline__outer-segment"/>
            <HeaderThumbnail reportResult={prevReportResult} position="prev"/>
            <div className="HeaderTimeline__inner-segment"/>
          </>
        }
      </div>
      <div className="HeaderTimeline__current-thumbnail">
        <HeaderThumbnail reportResult={reportResult} position="main"/>
      </div>
      <div className="HeaderTimeline__next-thumbnail">
        {
          nextReportResult && <>
            <div className="HeaderTimeline__inner-segment"/>
            <HeaderThumbnail reportResult={nextReportResult} position="next"/>
            <div className="HeaderTimeline__outer-segment"/>
          </>
        }
      </div>
    </div>
  );
};

export const Header: FunctionComponent<{currentLhr: LH.FlowResult.LhrRef}> =
({currentLhr}) => {
  return (
    <div className="Header">
      <HeaderTimeline currentLhr={currentLhr}/>
    </div>
  );
};
