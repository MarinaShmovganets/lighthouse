/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

/* eslint-disable max-len */

export const SummaryIcon: FunctionComponent = () => {
  return (
    <svg width="14" viewBox="0 0 18 16" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2C0 1.17 0.67 0.5 1.5 0.5C2.33 0.5 3 1.17 3 2C3 2.83 2.33 3.5 1.5 3.5C0.67 3.5 0 2.83 0 2ZM0 8C0 7.17 0.67 6.5 1.5 6.5C2.33 6.5 3 7.17 3 8C3 8.83 2.33 9.5 1.5 9.5C0.67 9.5 0 8.83 0 8ZM1.5 12.5C0.67 12.5 0 13.18 0 14C0 14.82 0.68 15.5 1.5 15.5C2.32 15.5 3 14.82 3 14C3 13.18 2.33 12.5 1.5 12.5ZM18 15H5V13H18V15ZM5 9H18V7H5V9ZM5 3V1H18V3H5Z" fill="currentColor"/>
    </svg>
  );
};

export const NavigationIcon: FunctionComponent = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a navigation report">
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"/>
    </svg>
  );
};

export const TimespanIcon: FunctionComponent = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a timespan report">
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="2"/>
      <path
        d="m 8,4 v 4 l 4,1.9999998"
        stroke="currentColor"
        stroke-width="1.5"/>
    </svg>
  );
};

export const SnapshotIcon: FunctionComponent = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      role="img"
      aria-label="Icon representing a snapshot report">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M 12.2038,12.2812 C 11.1212,13.3443 9.6372,14 8,14 7.81038,14 7.62281,13.9912 7.43768,13.974 L 10.3094,9 Z M 12.8925,11.4741 10.0207,6.5 H 13.811 C 13.9344,6.97943 14,7.48205 14,8 c 0,1.2947 -0.4101,2.4937 -1.1075,3.4741 z M 13.456,5.5 H 7.71135 L 9.6065,2.21749 C 11.3203,2.69259 12.7258,3.90911 13.456,5.5 Z M 8.5624,2.02601 C 8.3772,2.0088 8.1896,2 8,2 6.36282,2 4.8788,2.65572 3.79622,3.71885 L 5.69061,7.00002 Z M 3.10749,4.52594 C 2.4101,5.5063 2,6.70526 2,8 2,8.5179 2.06563,9.0206 2.18903,9.5 H 5.97927 Z M 2.54404,10.5 c 0.73017,1.5909 2.1357,2.8074 3.84949,3.2825 L 8.2887,10.5 Z M 16,8 c 0,4.4183 -3.5817,8 -8,8 C 3.58172,16 0,12.4183 0,8 0,3.58172 3.58172,0 8,0 c 4.4183,0 8,3.58172 8,8 z"
        fill="currentColor"/>
    </svg>
  );
};

export const EnvIcon: FunctionComponent = () => {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M3.33317 2.00008H13.9998V0.666748H3.33317C2.59984 0.666748 1.99984 1.26675 1.99984 2.00008V9.33341H0.666504V11.3334H7.99984V9.33341H3.33317V2.00008ZM13.9998 3.33341H9.99984C9.63317 3.33341 9.33317 3.63341 9.33317 4.00008V10.6667C9.33317 11.0334 9.63317 11.3334 9.99984 11.3334H13.9998C14.3665 11.3334 14.6665 11.0334 14.6665 10.6667V4.00008C14.6665 3.63341 14.3665 3.33341 13.9998 3.33341ZM10.6665 9.33341H13.3332V4.66675H10.6665V9.33341Z" fill="currentColor"/>
    </svg>
  );
};

export const CpuIcon: FunctionComponent = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" role="img">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M15.5 7.16667V5.5H13.8333V3.83333C13.8333 2.91667 13.0833 2.16667 12.1667 2.16667H10.5V0.5H8.83333V2.16667H7.16667V0.5H5.5V2.16667H3.83333C2.91667 2.16667 2.16667 2.91667 2.16667 3.83333V5.5H0.5V7.16667H2.16667V8.83333H0.5V10.5H2.16667V12.1667C2.16667 13.0833 2.91667 13.8333 3.83333 13.8333H5.5V15.5H7.16667V13.8333H8.83333V15.5H10.5V13.8333H12.1667C13.0833 13.8333 13.8333 13.0833 13.8333 12.1667V10.5H15.5V8.83333H13.8333V7.16667H15.5ZM10.5 5.5H5.5V10.5H10.5V5.5ZM3.83333 12.1667H12.1667V3.83333H3.83333V12.1667Z" fill="currentColor"/>
    </svg>
  );
};

export const HamburgerIcon: FunctionComponent = () => {
  return (
    <svg viewBox="0 0 18 12" width="18" height="12" role="img">
      <rect width="18" height="2"></rect>
      <rect y="5" width="18" height="2"></rect>
      <rect y="10" width="18" height="2"></rect>
    </svg>
  );
};

export const Logo: FunctionComponent = () => {
  return (
    <svg class="lh-topbar__logo" height="24" width="24" viewBox="0 0 24 24">
      <defs>
        <linearGradient x1="57.456%" y1="13.086%" x2="18.259%" y2="72.322%" id="lh-topbar__logo--a">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="100%" y1="50%" x2="0%" y2="50%" id="lh-topbar__logo--b">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="58.764%" y1="65.756%" x2="36.939%" y2="50.14%" id="lh-topbar__logo--c">
          <stop stop-color="#262626" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#262626" stop-opacity="0" offset="100%"/>
        </linearGradient>
        <linearGradient x1="41.635%" y1="20.358%" x2="72.863%" y2="85.424%" id="lh-topbar__logo--d">
          <stop stop-color="#FFF" stop-opacity=".1" offset="0%"/>
          <stop stop-color="#FFF" stop-opacity="0" offset="100%"/>
        </linearGradient>
      </defs>
      <g fill="none" fill-rule="evenodd">
        <path d="M12 3l4.125 2.625v3.75H18v2.25h-1.688l1.5 9.375H6.188l1.5-9.375H6v-2.25h1.875V5.648L12 3zm2.201 9.938L9.54 14.633 9 18.028l5.625-2.062-.424-3.028zM12.005 5.67l-1.88 1.207v2.498h3.75V6.86l-1.87-1.19z" fill="#F44B21"/>
        <path fill="#FFF" d="M14.201 12.938L9.54 14.633 9 18.028l5.625-2.062z"/>
        <path d="M6 18c-2.042 0-3.95-.01-5.813 0l1.5-9.375h4.326L6 18z" fill="url(#lh-topbar__logo--a)" fill-rule="nonzero" transform="translate(6 3)"/>
        <path fill="#FFF176" fill-rule="nonzero" d="M13.875 9.375v-2.56l-1.87-1.19-1.88 1.207v2.543z"/>
        <path fill="url(#lh-topbar__logo--b)" fill-rule="nonzero" d="M0 6.375h6v2.25H0z" transform="translate(6 3)"/>
        <path fill="url(#lh-topbar__logo--c)" fill-rule="nonzero" d="M6 6.375H1.875v-3.75L6 0z" transform="translate(6 3)"/>
        <path fill="url(#lh-topbar__logo--d)" fill-rule="nonzero" d="M6 0l4.125 2.625v3.75H12v2.25h-1.688l1.5 9.375H.188l1.5-9.375H0v-2.25h1.875V2.648z" transform="translate(6 3)"/>
      </g>
    </svg>
  );
};
