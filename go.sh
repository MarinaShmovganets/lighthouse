#!/bin/bash

chrome-linux/chrome --version
chrome-linux/chrome --remote-debugging-port=9222 &> chrome.stdout &

npm install -g lighthouse

lighthouse https://example.com --port=9222 --output=json

cat chrome.stdout

