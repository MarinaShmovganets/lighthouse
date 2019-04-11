#!/usr/bin/env bash
set -x

# Manually install this one report dependency. Avoid installing all deps (for speed)
rm package.json
npm install details-element-polyfill@2.2.0

# Create dist if it's not already there
mkdir -p dist

# Generate the report and place as dist/index.html
node lighthouse-core/scripts/build-report-to-dist.js
