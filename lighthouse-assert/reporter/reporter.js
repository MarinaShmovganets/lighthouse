/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require('lighthouse-logger');
class DefaultReporter {
    /**
     * Output error message
     *
     * @param {IDiff} diff
     */
    stderr(diff) {
        let msg = `  ${log.redify(log.cross)} difference at ${diff.path}: `;
        msg += log.redify(`found ${diff.actual}, expected ${JSON.stringify(diff.expected, null, 2)}\n`);
        console.log(msg);
    }
    /**
     * Output count of failed expectations
     *
     * @param {number} count
     */
    stdoutFailingStatus(count) {
        console.log(log.redify(`${count} failing`));
    }
    /**
     * Output count of passed expectations
     *
     * @param {number} count
     */
    stdoutPassingStatus(count) {
        console.log(log.greenify(`${count} passing`));
    }
}
exports.DefaultReporter = DefaultReporter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHOzs7QUFFSCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQVN6QztJQUNFOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsSUFBVztRQUNoQixJQUFJLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO1FBQ3BFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLE1BQU0sY0FBYyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsbUJBQW1CLENBQUMsS0FBYTtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxtQkFBbUIsQ0FBQyxLQUFhO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0Y7QUE5QkQsMENBOEJDIn0=