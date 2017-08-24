const log = require('lighthouse-logger');
import { Diff } from '../'

export interface IReporter {
  stderr: (diff: any) => void;
  stdoutFailingStatus: (count: number) => void;
  stdoutPassingStatus: (count: number) => void;
}

export class DefaultReporter implements IReporter {
  stderr(diff: Diff) {
    let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
    msg += log.redify(`found ${diff.actual}, expected ${diff.expected}\n`);

    console.log(msg);
  }

  stdoutFailingStatus(count: number) {
    console.log(log.redify(`${count} passing`));
  }

  stdoutPassingStatus(count: number) {
    console.log(log.greenify(`${count} passing`));
  }
}
