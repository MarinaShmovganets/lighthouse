#!/usr/bin/env bash

reset="\e[0m"
dim="\e[2m"
bold="\e[1m"

command="node lighthouse-cli/test/fixtures/static-server.js &"

echo -e $bold"perf smokehouse $reset"
echo -e "$dim\$ $command $reset"
eval $command

sleep 0.5s

config="lighthouse-core/config/perf.json"
expectations="lighthouse-cli/test/smokehouse/perf/expectations.js"
save_assets=""

if [[ "$CI" = true ]]; then
  # save assets so that failures may be examined later
  save_assets="--save-assets-path=perf.json"
fi

yarn smokehouse -- --config-path=$config --expectations-path=$expectations "$save_assets"
exit_code=$?

# kill test servers
kill $(jobs -p)

exit "$exit_code"
