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

const MAX_WAIT_TIMEOUT = 10 * 1000;

class WebSQL extends Gatherer {

  static get MAX_WAIT_TIMEOUT() {
    return MAX_WAIT_TIMEOUT;
  }

  listenForDatabaseEvents(driver) {
    let timeout;

    return new Promise((resolve, reject) => {
      driver.once('Database.addDatabase', db => {
        if (timeout) {
          clearTimeout(timeout);
        }
        driver.sendCommand('Database.disable');
        resolve(db);
      });

      driver.sendCommand('Database.enable');

      // Wait for a websql db to be opened. Reject the Promise if none were.
      // TODO(ericbidelman): this assumes dbs are only opened 10s within page
      // load. Figure out a better strategy (code greping, user interaction) later.
      timeout = setTimeout(function() {
        reject('No WebSQL databases were opened');
      }, WebSQL.MAX_WAIT_TIMEOUT);
    });
  }

  afterPass(options) {
    return this.listenForDatabaseEvents(options.driver)
      .then(database => {
        this.artifact = database;
      }, reason => {
        this.artifact = {
          database: null,
          debugString: reason
        };
      })
      .catch(_ => {
        this.artifact = -1;
      });
  }
}

module.exports = WebSQL;
