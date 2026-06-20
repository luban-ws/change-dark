#!/usr/bin/env sh
# pre-push：与 .github/workflows/ci.yml 同序 — build → test → lint。
set -eu

. "$(dirname "$0")/enforce-no-bypass.sh"

cd "$(git rev-parse --show-toplevel)"

export TURBO_TELEMETRY_DISABLED=1
export CI=true

echo "husky pre-push: pnpm run build"
pnpm run build

echo "husky pre-push: pnpm run test"
pnpm run test

echo "husky pre-push: pnpm run lint"
pnpm run lint
