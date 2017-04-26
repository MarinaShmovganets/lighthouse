#!/usr/bin/env bash

reset="\e[0m"
dim="\e[2m"
bold="\e[1m"

command="node lighthouse-cli/test/fixtures/static-server.js &"

echo -e $bold"offline-local smokehouse $reset"
echo -e "$dim\$ $command $reset"
eval $command

sleep 0.5s

config="lighthouse-core/config/default.js"
expectations="lighthouse-cli/test/smokehouse/offline-local/offline-expectations.js"

# run smoketest, expecting results found in offline-expectations
yarn smokehouse -- --config-path=$config --expectations-path=$expectations
exit_code=$?

# kill test servers
kill $(jobs -p)

exit "$exit_code"
