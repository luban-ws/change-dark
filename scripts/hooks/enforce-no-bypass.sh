#!/usr/bin/env sh
# 仓库策略：禁止用环境变量跳过 hooks。
if [ "${HUSKY-}" = "0" ] || [ "${HUSKY_SKIP_HOOKS-}" = "1" ] || [ "${SKIP_HOOKS-}" = "1" ]; then
  echo "错误: 本仓库禁止跳过 git hooks（不可使用 HUSKY=0、HUSKY_SKIP_HOOKS、SKIP_HOOKS）。" >&2
  exit 1
fi
