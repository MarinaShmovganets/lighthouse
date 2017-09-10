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
