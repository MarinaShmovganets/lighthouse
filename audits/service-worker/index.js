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

class ServiceWorkerTest {

  run(inputs) {

    this.url = inputs.url;

    return new Promise((resolve, reject) => {
      const driver = inputs.driver;

      driver.gotoURL(this.url, driver.WAIT_FOR_LOAD)
          .then(driver.getServiceWorkerRegistrations)

          // Test the result for validity.
          .then(registrations => {

            const activatedRegistrations =
                registrations.versions.filter(reg => reg.status === 'activated');

            resolve(activatedRegistrations.length > 0);

          });
    });
  }
}

module.exports = new ServiceWorkerTest();
