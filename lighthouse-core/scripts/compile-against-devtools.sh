#!/usr/bin/env bash

local_script_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$local_script_path/../../"

frontend_path="$lhroot_path/node_modules/temp-devtoolsfrontend"
protocol_path="$lhroot_path/node_modules/temp-devtoolsprotocol"

# clone if they're not there
if [ ! -d "$frontend_path" ]; then
  git clone --depth=1 git://github.com/ChromeDevTools/devtools-frontend.git "$frontend_path"
fi 
if [ ! -d "$protocol_path" ]; then
  git clone --depth=1 git://github.com/ChromeDevTools/devtools-protocol.git "$protocol_path"
fi

# update to latest
cd "$frontend_path" && git reset --hard && git fetch origin master && git checkout --force origin/master
cd "$protocol_path" && git reset --hard && git fetch origin master && git checkout --force origin/master

cd "$lhroot_path" || exit 1

# copy renderer and lh backgrond into this devtools checkout
yarn devtools -- "$frontend_path/front_end/"

# compile
python "$frontend_path/scripts/compile_frontend.py" --protocol-externs-file "$protocol_path/externs/protocol_externs.js"

# FYI the compile_frontend script deletes externs/protocol_externs.js when it's done.
