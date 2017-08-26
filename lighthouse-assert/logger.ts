/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {IReporter} from './reporter/reporter';

export class Logger {
  constructor(private reporter: IReporter) {}

  /**
   * Output error message
   *
   * @param {*} diff
   */
  stderr(diff: any) {
    return this.reporter.stderr(diff);
  }

  /**
   * Output count of failed expectations
   *
   * @param {number} count
   */
  stdoutFailingStatus(count: number) {
    return this.reporter.stdoutFailingStatus(count);
  }

  /**
   * Output count of passed expectations
   *
   * @param {number} count
   */
  stdoutPassingStatus(count: number) {
    return this.reporter.stdoutPassingStatus(count);
  }
}
