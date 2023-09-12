/**
 * @license
 * Copyright 2021 The Lighthouse Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {renderCategoryScore} from '../../../report/renderer/api';
import {useExternalRenderer} from '../util';

export const CategoryScore: FunctionComponent<{
  category: LH.ReportResult.Category,
  href: string,
  gatherMode: LH.Result.GatherMode,
}> = ({category, href, gatherMode}) => {
  const ref = useExternalRenderer<HTMLDivElement>(() => {
    return renderCategoryScore(category, {
      gatherMode,
      omitLabel: true,
      onPageAnchorRendered: link => link.href = href,
    });
  }, [category, href]);

  return (
    <div ref={ref} data-testid="CategoryScore"/>
  );
};
