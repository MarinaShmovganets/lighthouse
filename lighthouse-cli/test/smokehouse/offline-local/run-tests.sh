#!/usr/bin/env bash

if [[ $(node -v) =~ ^v4.* ]]; then export __node_harmony=--harmony; fi

node lighthouse-cli/test/fixtures/static-server.js &

sleep 0.5s

config="lighthouse-core/config/default.js"
expectations="lighthouse-cli/test/smokehouse/offline-local/offline-expectations.js"

# run smoketest, expecting results found in offline-expectations
npm run -s smokehouse -- --config-path=$config --expectations-path=$expectations
exit_code=$?

# kill test servers
kill $(jobs -p)

exit "$exit_code"
