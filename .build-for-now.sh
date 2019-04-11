#!/usr/bin/env bash
set -x

# manually install this one report dependency. Avoid installing all deps.
rm package.json
npm install details-element-polyfill@2.2.0

# create dist if it's not already there
mkdir -p dist

# generate the report and place as dist/index.html
node lighthouse-core/scripts/build-report-to-dist.js
