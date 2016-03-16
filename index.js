/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

let AuditLoader = require('./helpers/audit-loader');
let ChromeProtocol = require('./helpers/browser/driver');
let processor = require('./lib/processor');

class AuditRunner {

  static get() {
    return new Promise((resolve, reject) => {
      AuditLoader.getAudits('audits').then(audits => {
        resolve(new AuditRunner(audits));
      });
    });
  }

  constructor(audits) {
    this.audits_ = audits;
    this.driver_ = null;
  }

  audit(url) {
    const driver = new ChromeProtocol();

    return driver.gotoURL(url)
        .then(() => {
          const auditNames = Object.keys(this.audits_);
          const auditResponses = [];

          auditNames.forEach(auditName => {
            const auditInfo = this.audits_[auditName];
            const audit = require(auditInfo.main);

            auditResponses
                .push(audit.run({
                  url: url,
                  driver: driver
                })
                .then(result => {
                  return {auditName, result};
                })
            );
          });

          return Promise.all(auditResponses);
        });
  }
}

AuditRunner.get()
    .then(runner => runner.audit('https://voice-memos.appspot.com/'))
    .then(results => {
      console.log(results);
      process.exit(0);
    }, err => {
      console.error(err);
    });

module.exports = {
  RESPONSE: processor.RESPONSE,
  ANIMATION: processor.ANIMATION,
  LOAD: processor.LOAD,

  analyze: function(traceContents, opts) {
    return processor.analyzeTrace(traceContents, opts);
  }
};
