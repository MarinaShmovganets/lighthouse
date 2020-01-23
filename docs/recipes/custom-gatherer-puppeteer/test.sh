#!/usr/bin/env bash

cd "$(dirname "$0")"

yarn
node lighthouse --config-path=custom-config.js https://www.example.com --output=json \
  | jq '.audits["searchable-audit"].score' \
  | grep -q 1
