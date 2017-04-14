#!/usr/bin/env bash

##
# @license Copyright 2017 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

chromium_dir="$HOME/chromium/src"
frontend_dir="$chromium_dir/third_party/WebKit/Source/devtools/front_end"

if [ ! -d "$frontend_dir" ]; then
  echo -e "\033[31m✖ Error!\033[39m"
  echo "This script requires your Chromium checkout is located here:"
  echo "    $chromium_dir"
  exit 0
else
  echo -e "\033[96m ✓\033[39m Chromium folder in place."
fi

v2dir="lighthouse-core/report/v2"
fe_lh_dir="$frontend_dir/audits2/lighthouse"

lh_bg_js="lighthouse-extension/dist/scripts/lighthouse-background.js"
lh_worker_dir="$frontend_dir/audits2_worker/lighthouse"


# copy report files
cp -pPR $v2dir/{report-styles.css,templates.html,renderer} "$fe_lh_dir"
echo -e "\033[32m ✓\033[39m Report renderer files copied."

# copy lighthouse-background (potentially stale)
cp -pPR "$lh_bg_js" "$lh_worker_dir/lighthouse-background.js"
echo -e "\033[96m ✓\033[39m (Potentially stale) lighthouse-background copied."

# browserify a fresh lighthouse-background and copy again
gulp --cwd "lighthouse-extension" browserify-lighthouse
cp -pPR "$lh_bg_js" "$lh_worker_dir/lighthouse-background.js"
echo -e "\033[32m ✓\033[39m Fresh lighthouse-background copied."
