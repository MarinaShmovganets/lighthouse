/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {getScoreRating} from './util';

const FlowModeIcon: FunctionComponent<{mode: LH.Result.GatherMode}> = ({mode}) => {
  return <div className={`FlowModeIcon FlowModeIcon--${mode}`}></div>;
};

export const FlowStepIcon: FunctionComponent<{mode?: LH.Result.GatherMode}> = ({mode}) => {
  return (
    <div className="FlowStepIcon">
      <div className="FlowStepIcon__top-line"/>
      {
        mode && <FlowModeIcon mode={mode}/>
      }
      <div className="FlowStepIcon__bottom-line"/>
    </div>
  );
};

export const CategorySummary: FunctionComponent<{
  category: LH.ReportResult.Category,
  audits: LH.Result['audits'],
  href: string,
}> = ({category, audits, href}) => {
  const numAudits = category.auditRefs.length;

  let numPassed = 0;
  let totalWeight = 0;
  for (const auditRef of category.auditRefs) {
    totalWeight += auditRef.weight;
    const audit = audits[auditRef.id];
    if (!audit) {
      console.warn(`Could not find score for audit '${auditRef.id}', treating as failed.`);
      continue;
    }
    if (audit.score === 1) numPassed++;
  }

  let rating = 'null';
  if (category.score !== null && totalWeight > 0) rating = getScoreRating(category.score);

  return (
    <a href={href} className={`CategorySummary CategorySummary--${rating}`}>
      {`${numPassed}/${numAudits}`}
    </a>
  );
};
