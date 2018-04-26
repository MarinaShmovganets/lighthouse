/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

interface SpeedlineOutput {
  beginning: number;
  end: number;
  speedIndex: number;
  first: number;
  complete: number;
  duration: number;
  frames: {
    getProgress(): number;
    getTimeStamp(): number;
    isProgressInterpolated(): number;
  }[]
}

interface SpeedlineOptions {
  timeOrigin?: number;
  fastMode?: boolean;
  include?: 'all' | 'speedIndex' | 'perceptualSpeedIndex';
}

declare module 'speedline' {
  function Speedline(trace: LH.TraceEvent[], opts: SpeedlineOptions): SpeedlineOutput;

  export = Speedline;
}
