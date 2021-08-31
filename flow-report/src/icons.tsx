/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';

/* eslint-disable max-len */

export const SummaryIcon: FunctionComponent = () => {
  return (
    <svg width="14" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M0 2C0 1.17 0.67 0.5 1.5 0.5C2.33 0.5 3 1.17 3 2C3 2.83 2.33 3.5 1.5 3.5C0.67 3.5 0 2.83 0 2ZM0 8C0 7.17 0.67 6.5 1.5 6.5C2.33 6.5 3 7.17 3 8C3 8.83 2.33 9.5 1.5 9.5C0.67 9.5 0 8.83 0 8ZM1.5 12.5C0.67 12.5 0 13.18 0 14C0 14.82 0.68 15.5 1.5 15.5C2.32 15.5 3 14.82 3 14C3 13.18 2.33 12.5 1.5 12.5ZM18 15H5V13H18V15ZM5 9H18V7H5V9ZM5 3V1H18V3H5Z" fill="currentColor"/>
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
      fill="none">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M 12.2038,12.2812 C 11.1212,13.3443 9.6372,14 8,14 7.81038,14 7.62281,13.9912 7.43768,13.974 L 10.3094,9 Z M 12.8925,11.4741 10.0207,6.5 H 13.811 C 13.9344,6.97943 14,7.48205 14,8 c 0,1.2947 -0.4101,2.4937 -1.1075,3.4741 z M 13.456,5.5 H 7.71135 L 9.6065,2.21749 C 11.3203,2.69259 12.7258,3.90911 13.456,5.5 Z M 8.5624,2.02601 C 8.3772,2.0088 8.1896,2 8,2 6.36282,2 4.8788,2.65572 3.79622,3.71885 L 5.69061,7.00002 Z M 3.10749,4.52594 C 2.4101,5.5063 2,6.70526 2,8 2,8.5179 2.06563,9.0206 2.18903,9.5 H 5.97927 Z M 2.54404,10.5 c 0.73017,1.5909 2.1357,2.8074 3.84949,3.2825 L 8.2887,10.5 Z M 16,8 c 0,4.4183 -3.5817,8 -8,8 C 3.58172,16 0,12.4183 0,8 0,3.58172 3.58172,0 8,0 c 4.4183,0 8,3.58172 8,8 z"
        fill="currentColor"/>
    </svg>
  );
};
