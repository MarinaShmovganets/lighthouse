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

const Gatherer = require('../gatherer');
const TagsBlockingFirstPaint = require('./tags-blocking-first-paint');

class ScriptsBlockingFirstPaint extends Gatherer {

  afterPass(options, tracingData) {
    return TagsBlockingFirstPaint
      .findBlockingTags(options.driver, tracingData.networkRecords, 'SCRIPT')
      .then(artifact => {
        const items = artifact.items.map(item => {
          return {
            script: item.tag,
            transferSize: item.transferSize,
            spendTime: item.spendTime
          };
        }, []);

        this.artifact = {items, total: artifact.total};
      })
      .catch(debugString => {
        this.artifact = {
          value: -1,
          debugString
        };
      });
  }
}

module.exports = ScriptsBlockingFirstPaint;
