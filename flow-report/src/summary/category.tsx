/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

import {Util} from '../../../report/renderer/util';
import {Separator} from '../common';
import {CategoryScore} from '../wrappers/category-score';
import {useUIStrings} from '../i18n/i18n';

import type {UIStringsType} from '../i18n/ui-strings';

function getGatherModeLabel(gatherMode: LH.Result.GatherMode, UIStrings: UIStringsType) {
  switch (gatherMode) {
    case 'navigation': return UIStrings.navigationReport;
    case 'timespan': return UIStrings.timespanReport;
    case 'snapshot': return UIStrings.snapshotReport;
  }
}

function getCategoryRating(rating: string, UIStrings: UIStringsType) {
  switch (rating) {
    case 'pass': return UIStrings.ratingPass;
    case 'average': return UIStrings.ratingAverage;
    case 'fail': return UIStrings.ratingFail;
    case 'error': return UIStrings.ratingError;
  }
}

export const SummaryTooltip: FunctionComponent<{
  category: LH.ReportResult.Category,
  gatherMode: LH.Result.GatherMode
}> = ({category, gatherMode}) => {
  const strings = useUIStrings();
  const {numPassed, numAudits, totalWeight} = Util.calculateCategoryFraction(category);

  const displayAsFraction = Util.shouldDisplayAsFraction(gatherMode);
  const rating = displayAsFraction ?
    Util.calculateRating(numPassed / numAudits) :
    Util.calculateRating(category.score);

  return (
    <div className="SummaryTooltip">
      <div className="SummaryTooltip__title">{getGatherModeLabel(gatherMode, strings)}</div>
      <Separator/>
      <div className="SummaryTooltip__category">
        <div className="SummaryTooltip__category-title">
          {category.title}
        </div>
        {
          totalWeight !== 0 &&
            <div
              className={`SummaryTooltip__rating SummaryTooltip__rating--${rating}`}
              data-testid="SummaryTooltip__rating"
            >
              <span>{getCategoryRating(rating, strings)}</span>
              {
                !displayAsFraction && category.score && <>
                  <span> · </span>
                  <span>{category.score * 100}</span>
                </>
              }
            </div>
        }
      </div>
      <div className="SummaryTooltip__fraction">
        {`${numPassed} audits passed / ${numAudits} audits run`}
      </div>
    </div>
  );
};

export const SummaryCategory: FunctionComponent<{
  category: LH.ReportResult.Category|undefined,
  href: string,
  gatherMode: LH.Result.GatherMode,
}> = ({category, href, gatherMode}) => {
  return (
    <div className="SummaryCategory">
      {
        category ?
          <div className="SummaryCategory__content">
            <CategoryScore
              category={category}
              href={href}
              gatherMode={gatherMode}
            />
            <SummaryTooltip category={category} gatherMode={gatherMode}/>
          </div> :
          <div
            className="SummaryCategory__null"
            data-testid="SummaryCategory__null"
          />
      }
    </div>
  );
};
