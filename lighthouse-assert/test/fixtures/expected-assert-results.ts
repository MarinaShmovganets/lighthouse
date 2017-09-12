/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * Expected Lighthouse audit values for --perf tests
 */
export default [
  {
    "finalUrl": {
      "category": "final url",
      "actual": "http://localhost:10200/tricky-ttci.html",
      "expected": "http://localhost:10200/tricky-ttci.html",
      "equal": true
    },
    "audits": [
      {
        "category": "first-contentful-paint",
        "actual": {
          "score": 100,
          "rawValue": ">3000"
        },
        "expected": {
          "score": {
            "warn": '>=65',
            "error": '<=85',
          },
        },
        "equal": true,
        "diff": {}
      },
      {
        "category": "first-meaningful-paint",
        "actual": {
          "score": "60",
          "rawValue": ">3000"
        },
        "expected": {
          "score": {
            "warn": '<=65',
            "error": '<=85',
          },
        },
        "equal": false,
        "diff": {
          "path": "first-meaningful-paint.score",
          "actual": "60",
          "expected": {
            "warn": '<=65',
            "error": '<=85',
          }
        }
      },
      {
        "category": "first-interactive",
        "actual": {
          "score": "100",
          "rawValue": ">9000"
        },
        "expected": {
          "score": {
            "warn": '<=65',
            "error": '<=85',
          },
        },
        "equal": true,
        "diff": {}
      },
      {
        "category": "consistently-interactive",
        "actual": {
          "score": "<80",
          "rawValue": ">9000"
        },
        "expected": {
          "score": {
            "error": "<75",
            "warn": "<75"
          },
        },
        "equal": true,
        "diff": {}
      }
    ]
  }
];
