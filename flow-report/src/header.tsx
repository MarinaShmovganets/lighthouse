/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

import {Util} from '../../report/renderer/util';
import {FlowStepIcon, FlowStepThumbnail} from './common';
import {getModeDescription, useFlowResult} from './util';

const SIDE_THUMBNAIL_WIDTH = 40;
const MAIN_THUMBNAIL_WIDTH = 70;

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

export const Header: FunctionComponent<{currentLhr: LH.FlowResult.LhrRef}> =
({currentLhr}) => {
  const flowResult = useFlowResult();
  const step = flowResult.steps[currentLhr.index];
  const prevStep = flowResult.steps[currentLhr.index - 1];
  const nextStep = flowResult.steps[currentLhr.index + 1];
  return (
    <div className="Header">
      {
        prevStep && <>
          <div className="Header__prev-thumbnail">
            <div className="Header__outer-segment"/>
            <HeaderThumbnail reportResult={Util.prepareReportResult(prevStep.lhr)} position="prev"/>
            <div className="Header__inner-segment"/>
          </div>
          <a
            className="Header__prev-title"
            href={`#index=${currentLhr.index - 1}`}
          >{prevStep.name}</a>
        </>
      }
      <div className="Header__current-thumbnail">
        <HeaderThumbnail reportResult={Util.prepareReportResult(step.lhr)} position="main"/>
      </div>
      <div className="Header__current-title">
        {step.name}
        <div className="Header__current-description">
          {getModeDescription(step.lhr.gatherMode)}
        </div>
      </div>
      {
        nextStep && <>
          <div className="Header__next-thumbnail">
            <div className="Header__inner-segment"/>
            <HeaderThumbnail reportResult={Util.prepareReportResult(nextStep.lhr)} position="next"/>
            <div className="Header__outer-segment"/>
          </div>
          <a
            className="Header__next-title"
            href={`#index=${currentLhr.index + 1}`}
          >{nextStep.name}</a>
        </>
      }
    </div>
  );
};
