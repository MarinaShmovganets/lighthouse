#!/bin/bash

# Downloads the latest golden lantern data from gcloud.

set -e

VERSION="2019-12-17"

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

for f in core/test/fixtures/artifacts/*/regenerate.js; do
  echo "running $f"
  node $f
done
