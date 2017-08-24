import { Assert, Result, Expectation } from './assert/assert';
import { IReporter, DefaultReporter } from './reporter/reporter';
import { Logger } from './logger';

export class LighthouseAssert {
  private assertInstance: Assert;
  private logger: IReporter;

  constructor(reporter?: IReporter) {
    reporter = reporter || new DefaultReporter();
    this.logger = new Logger(reporter);
  }

  assert(results: Array<Result>, expectations: Array<Expectation>) {
    this.assertInstance = new Assert(results, expectations);
    this.assertInstance.collate();

    if (this.assertInstance.equal()) {
      this.logger.stdoutPassingStatus(this.assertInstance.getStatusCounts().passed);
    } else {
      this.logger.stdoutFailingStatus(this.assertInstance.getStatusCounts().failed);
      this.showError();
    }
  }

  private showError() {
    for (const result of this.assertInstance.collatedResults) {
      for (const audit of result.audits) {
        if (!audit.equal)
          this.logger.stderr(audit.diff);
      }
    }
  }
}

export * from './assert/assert';
export * from './logger';
export * from './reporter/reporter';
