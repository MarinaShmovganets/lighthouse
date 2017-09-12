/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { IDiff } from '../types';
import { DeepObjectDifference } from './deep-object';
import { ObjectDifference } from './object';
import { BooleanDifference } from './boolean';

export class DifferenceFactory {
  /**
   * Find difference comparing to actual result.
   *
   * @param {string} path
   * @param {*} actual
   * @param {*} expected
   * @return {IDiff}
   */
  static findDifference(path: string, actual: any, expected: any): IDiff {
    let difference;
    //@todo use generics
    if (actual && typeof actual === 'object') {
      difference = new DeepObjectDifference(path, actual, expected);
    } else if (actual && typeof actual.score === 'boolean') {
      difference = new BooleanDifference(path, actual, expected);
    } else {
      difference = new ObjectDifference(path, actual, expected);
    }
    // @todo add regexp diff class
    return difference.getDiff();
  }
}
