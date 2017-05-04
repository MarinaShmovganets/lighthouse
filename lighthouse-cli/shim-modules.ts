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

/** @fileoverview Some users may be unable to install the full dependency tree,
 * especially for the CLI. `opn` and `update-notifier` in particular have some
 * uncommon transitive dependencies, so these shims will let the modules no-op
 * if the real dependency is not installed.
 */

export let opn = () => {
	function shim(str: String, obj: Object) {
		console.error('module `opn` not installed. Not opening browser.');
		return [str, obj]
	}

	try {
  	return require('opn');
	} catch (e) {
		return shim;
 }
};


export let updateNotifier = () => {
	function shim(obj: Object) {
		console.error('module `update-notifier` not installed. Not checking for new version.');
		return { notify: () => obj };
	}

	try {
  	return require('update-notifier');
	} catch (e) {
		return shim;
	}
};
