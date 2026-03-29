# RFC 018 — 字体与文本描边（T-030）

| 字段 | 值 |
|------|-----|
| 状态 | Draft |
| 任务 ID | **T-030** |
| 参考 | [Dark Reader Help — More tab](https://darkreader.org/help/en/) |

依赖：[004](./004-policy-storage-migration-from-enabled-boolean.md)

## Summary

可选：**字体**替换与 **文本描边（text stroke）** 以增强暗底可读性；需全局开关，避免破坏站点设计。

## Goals

1. 字体：从预设列表或自定义 `font-family` 字符串注入；`!important` 策略谨慎。
2. 描边：`-webkit-text-stroke` 等，默认关闭。
3. 与 [RFC 016](./016-only-for-per-site-overrides.md) 可 per-site override。

## Non-goals

- 网页字体子集托管。

## Risks

| 风险 | 缓解 |
|------|------|
| CLS / FOUT | 可选延迟注入 |

## Testing

- 手工：中英混排、图标字体站点。

## Decision log

- 2026-03-29：独立 RFC。
