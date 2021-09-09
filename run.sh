#!/bin/bash

set -euxo pipefail

for i in {0..100}
do
  xvfb-run --auto-servernum yarn smoke --debug --fraggle-rock -j=1 --retries=0 csp
done
