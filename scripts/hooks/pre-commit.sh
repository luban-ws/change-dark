#!/usr/bin/env sh
# pre-commit：快速类型检查（与 CI lint 步一致）。
set -eu

. "$(dirname "$0")/enforce-no-bypass.sh"

cd "$(git rev-parse --show-toplevel)"

export TURBO_TELEMETRY_DISABLED=1

echo "husky pre-commit: pnpm run lint"
pnpm run lint
