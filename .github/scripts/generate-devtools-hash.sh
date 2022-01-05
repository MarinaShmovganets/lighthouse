#!/usr/bin/env bash

##
# @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

# Prints to stdout text that, when it changes, indicates that the devtools tests
# should update its dependencies (devtools frontend, content shell, blink tools).

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../.."

unameOut="$(uname -s)"
case "${unameOut}" in
  Linux*)     machine=Linux;;
  Darwin*)    machine=Mac;;
  MINGW*)     machine=MinGw;;
  *)          machine="UNKNOWN:${unameOut}"
esac

cd "$LH_ROOT"
bash .github/scripts/print-devtools-relevant-commits.sh
md5 \
  lighthouse-core/test/chromium-web-tests/* \
  third-party/chromium-webtests/webtests/http/tests/devtools/lighthouse/**/*.*

# Print something that changes once a week.
echo "Most recent Monday:"
if [ "$machine" == "Linux" ]; then
  date -dmonday "+%Y%m%d"
elif [ "$machine" == "Mac" ]; then
  date -v -Mon "+%Y%m%d"
else
  echo "unsupported platform"
  exit 1
fi
