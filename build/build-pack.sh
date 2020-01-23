#!/usr/bin/env bash

tmp_dir=$(mktemp -d -t lh-XXXXXXXXXX)
lh_dir=$(pwd)

cd tmp_dir
npm pack "$lh_dir"
mv *.tgz "$lh_dir/dist/lighthouse.tgz"

rmdir $tmp_dir
