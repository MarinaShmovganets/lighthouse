#!/usr/bin/env bash

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

tmp_dir=$(mktemp -d -t lh-XXXXXXXXXX)
lh_dir="$DIRNAME/.."

cd "$tmp_dir"
npm pack "$lh_dir"
mv *.tgz "$lh_dir/dist/lighthouse.tgz"

rmdir "$tmp_dir"
