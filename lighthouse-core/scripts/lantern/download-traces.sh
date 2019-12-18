#!/bin/bash

# Downloads the latest golden lantern data from gcloud.

set -ex

VERSION="2017-12-06"

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

if [[ -f lantern-data/version ]] && [["$VERSION" == "$(cat lantern-data/version)"]]; then
  echo "Deleting old lantern data."
  rm -rf lantern-data/
fi

if [[ -f lantern-data/site-index-plus-golden-expectations.json ]] && ! [[ "$FORCE" ]]; then
  echo "Lantern data already detected, done."
  exit 0
fi

rm -rf lantern-data/
mkdir -p lantern-data/ && cd lantern-data
echo $VERSION > version

gsutil cp gs://lh-lantern-data/lantern-traces-$VERSION.tar.gz lantern-traces.tar.gz

tar -xzf lantern-traces.tar.gz
rm lantern-traces.tar.gz
