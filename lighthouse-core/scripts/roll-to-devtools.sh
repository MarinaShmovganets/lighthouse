#!/usr/bin/env bash


v2dir="lighthouse-core/report/v2"
frontend_dir="$HOME/chromium/src/third_party/WebKit/Source/devtools/front_end"
fe_lh_dir="$frontend_dir/audits2/lighthouse"

lh_bg_js="lighthouse-extension/dist/scripts/lighthouse-background.js"
le_lhworker_dir="$frontend_dir/audits2_worker/lighthouse"


# copy report files
cp -pPRv $v2dir/{report-styles.css,templates.html,renderer} "$fe_lh_dir"

# copy lighthouse-background (potentially stale)
cp -pPRv "$lh_bg_js" "$le_lhworker_dir/lighthouse-background.js"

# browserify a fresh lighthouse-background and copy again
gulp --cwd "lighthouse-extension" browserify-lighthouse
cp -pPRv "$lh_bg_js" "$le_lhworker_dir/lighthouse-background.js"
