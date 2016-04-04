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

/**
 * Typing externs file for collected output of the artifact gatherers stage.
 * @externs
 */

/**
 * @struct
 * @record
 */
function Aggregation() {}

/** @type {number} */
Aggregation.prototype.overall;

/** @type {!Array<!Object>} */
Aggregation.prototype.subItems;

/**
 * @struct
 * @record
 */
function Criterion() {}

/** @type {?} */
Criterion.prototype.value;

/** @type {number} */
Criterion.prototype.weight;

/**
 * @type {Object<string, Criterion>}
 */
var Criteria = {};
