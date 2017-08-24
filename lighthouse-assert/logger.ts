import { IReporter } from './reporter/reporter';

export class Logger {
  constructor(private reporter: IReporter) {}

  stderr(diff: any) {
    return this.reporter.stderr(diff);
  }

  stdoutFailingStatus(count: number) {
    return this.reporter.stdoutFailingStatus(count);
  }

  stdoutPassingStatus(count: number) {
    return this.reporter.stdoutPassingStatus(count);
  }
}
