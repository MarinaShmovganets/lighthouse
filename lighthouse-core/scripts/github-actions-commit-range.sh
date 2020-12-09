#!/bin/bash

set -euo pipefail

# This script sets the environment variable `GITHUB_ACTIONS_COMMIT_RANGE` to the
# git parseable range of changes that are being tested in GitHub actions.

BASE_SHA=""
if [[ -n "$GITHUB_CONTEXT_PR_BASE_SHA" ]]; then
  echo "Pull request detected. Base SHA is ${GITHUB_CONTEXT_PR_BASE_SHA}"
  BASE_SHA="${GITHUB_CONTEXT_PR_BASE_SHA}"
elif [[ -n "$GITHUB_CONTEXT_BASE_SHA" ]]; then
  echo "Push event detected. Base SHA is ${GITHUB_CONTEXT_BASE_SHA}"
  BASE_SHA="${GITHUB_CONTEXT_BASE_SHA}"
else
  echo "No GitHub Actions context available. Exiting..."
  exit 1
fi

GITHUB_ACTIONS_COMMIT_RANGE="${BASE_SHA}..${GITHUB_SHA}"
echo "GITHUB_ACTIONS_COMMIT_RANGE=${GITHUB_ACTIONS_COMMIT_RANGE}" >> $GITHUB_ENV

echo "Commit range is ${GITHUB_ACTIONS_COMMIT_RANGE}"
git log --pretty=oneline "${GITHUB_ACTIONS_COMMIT_RANGE}"

