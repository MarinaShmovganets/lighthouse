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

const Gather = require('./gather');
const fs = require('fs');
const path = require('path');
const scriptsDir = path.resolve(__dirname, '..', '..', 'user_scripts');

class UserScripts extends Gather {
  get name() {
    return 'userScripts';
  }

  profiledPostPageLoad(options) {
    const driver = options.driver;

    const scripts = options.flags.scripts;

    let final = Buffer.from('new Promise(function(resolve, reject) { resolve(); })');

    for (let script of scripts) {
      final = Buffer.concat([final, Buffer.from('.then(function() {return ')]);
      final = Buffer.concat([final, fs.readFileSync(path.resolve(scriptsDir, script))]);
      final = Buffer.concat([final, Buffer.from('})')]);
    }

    final = Buffer.concat([final, Buffer.from('.then(function() { __returnResults(); })')]);
    final = Buffer.concat([final, Buffer.from('.catch(function() { __returnResults(); });')]);

    return driver
      .evaluateAsync(`${final.toString()}`)
      .then(_ => {
        console.log('We are done!');
      });
  }
}

module.exports = UserScripts;
