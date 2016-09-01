/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
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

const Audit = require('./audit');
const TracingProcessor = require('../lib/traces/tracing-processor');
const TRACE_NAME = 'scrolling';

class SmoothScrolling extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'smooth-scrolling',
      description: 'Page scrolls at 60fps',
      requiredArtifacts: ['Scrolling']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const traceContents = artifacts.traces[TRACE_NAME].traceContents;
    const tracingProcessor = new TracingProcessor();
    const model = tracingProcessor.init(traceContents);
    const smoothness = TracingProcessor.getAnimationSmoothness(model, traceContents);
    console.log('smoothness', smoothness);

    return SmoothScrolling.generateAuditResult({
      value: 0
    });
  }
}

module.exports = SmoothScrolling;
