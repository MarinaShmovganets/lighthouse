#!/usr/bin/env bash

##
# @license
# Copyright 2020 Google LLC
# SPDX-License-Identifier: Apache-2.0
##

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT="$SCRIPT_DIR/../../.."
BUILD_FOLDER="${BUILD_FOLDER:-LighthouseIntegration}"
CI="${CI:-}"

roll_devtools() {
  # Roll devtools. Besides giving DevTools the latest lighthouse source files,
  # this also copies over the e2e tests.
  cd "$LH_ROOT"
  yarn devtools "$DEVTOOLS_PATH"
  cd -
}

cd "$DEVTOOLS_PATH"
git --no-pager log -1
roll_devtools

# Needed to re-generate ninja rules, because there may possibly be e2e test files
# referenced in the rules initially generated by `download-devtools.sh` that
# `yarn devtools` deleted.
gclient sync --delete_unversioned_trees --reset

if [[ "$CI" ]]; then
  gn gen "out/$BUILD_FOLDER" --args='devtools_dcheck_always_on=true is_debug=false'
else
  gn gen "out/$BUILD_FOLDER" --args='devtools_dcheck_always_on=true is_debug=false devtools_skip_typecheck=true'
fi

# Build devtools. By default, this creates `out/LighthouseIntegration/gen/front_end`.
autoninja -C "out/$BUILD_FOLDER"
cd -
