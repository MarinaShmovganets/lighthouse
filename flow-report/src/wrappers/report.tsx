/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useLayoutEffect, useRef} from 'preact/hooks';
import {convertChildAnchors, useCurrentLhr, useHashParam} from '../util';
import {useReportRenderer} from './report-renderer';

export const Report: FunctionComponent = () => {
  const {dom, reportRenderer} = useReportRenderer();
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useHashParam('anchor');
  const currentLhr = useCurrentLhr();

  useLayoutEffect(() => {
    if (!currentLhr) return;

    dom.clearComponentCache();
    if (ref.current) {
      reportRenderer.renderReport(currentLhr.value, ref.current);
      convertChildAnchors(ref.current, currentLhr.index);
    }

    return () => {
      if (ref.current) ref.current.textContent = '';
    };
  }, [reportRenderer, currentLhr]);

  useLayoutEffect(() => {
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }

    // Scroll to top no anchor is found.
    if (ref.current) ref.current.scrollIntoView();
  }, [anchor, currentLhr]);

  return (
    <div ref={ref} className="lh-root" data-testid="Report"/>
  );
};
