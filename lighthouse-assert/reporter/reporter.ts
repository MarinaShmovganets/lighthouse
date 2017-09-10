/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

const log = require('lighthouse-logger');
import { IDiff } from '../assert/types';

export interface IReporter {
  stderr: (diff: any) => void;
  stdoutFailingStatus: (count: number) => void;
  stdoutPassingStatus: (count: number) => void;
}

export class DefaultReporter implements IReporter {
  /**
   * Output error message
   *
   * @param {IDiff} diff
   */
  stderr(diff: IDiff) {
    let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
    msg += log.redify(`found ${diff.actual}, expected ${JSON.stringify(diff.expected, null, 2)}\n`);

    console.log(msg);
  }

  /**
   * Output count of failed expectations
   *
   * @param {number} count
   */
  stdoutFailingStatus(count: number) {
    console.log(log.redify(`${count} failing`));
  }

  /**
   * Output count of passed expectations
   *
   * @param {number} count
   */
  stdoutPassingStatus(count: number) {
    console.log(log.greenify(`${count} passing`));
  }
}
