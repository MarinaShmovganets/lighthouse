#!/bin/bash

# THIS SCRIPT ASSUMES CWD IS ROOT PROJECT

TAR_URL="https://drive.google.com/a/chromium.org/uc?id=1_w2g6fQVLgHI62FApsyUDejZyHNXMLm0&amp;export=download"
curl -o lantern-traces.tar.gz -L $TAR_URL

tar -xzf lantern-traces.tar.gz
mv lantern-traces-subset lantern-data
rm lantern-traces.tar.gz
