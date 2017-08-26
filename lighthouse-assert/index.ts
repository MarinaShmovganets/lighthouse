/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import { Assert, IResult, IExpectation } from './assert/assert';
import { IReporter, DefaultReporter } from './reporter/reporter';
import { Logger } from './logger';

export class LighthouseAssert {
  private assertInstance: Assert;
  private logger: IReporter;

  constructor(reporter?: IReporter) {
    reporter = reporter || new DefaultReporter();
    this.logger = new Logger(reporter);
  }

  assert(results: Array<IResult>, expectations: Array<IExpectation>) {
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
