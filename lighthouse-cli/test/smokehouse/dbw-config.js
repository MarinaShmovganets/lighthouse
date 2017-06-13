/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Config file for running PWA smokehouse audits.
 */
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'deprecations',
      'appcache-manifest',
      'dom-size',
      'external-anchors-use-rel-noopener',
      'geolocation-on-start',
      'is-on-https',
      'link-blocking-first-paint',
      'no-document-write',
      'no-mutation-events',
      'no-websql',
      'notification-on-start',
      'password-inputs-can-be-pasted-into',
      'script-blocking-first-paint',
      'uses-passive-event-listeners',
      'uses-http2'
    ]
  }
};
