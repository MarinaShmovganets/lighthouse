/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const express = require('express');
const app = express();

app.get('/reports/:name', (request, response) => {
  const options = {
    root: `${__dirname}/reports/`
  };

  response.sendFile(request.params.name, options, err => {
    if (err) {
      console.log(err);
      response.status(err.status).end();
    }
  });
});

function listen(port) {
  return app.listen(port)
}

module.exports = {
  listen: listen
};

