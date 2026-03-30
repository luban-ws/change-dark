/**
 * Chrome Web Store / manifest 共用上架文案（单一数据源，避免超长或不同步）。
 * @see https://developer.chrome.com/docs/webstore/prepare
 */
export const CWS_HOMEPAGE_URL = 'https://luban-ws.github.io/change-dark/' as const

/** manifest `description`：官方上限 132 字符。 */
export const CWS_SHORT_DESCRIPTION =
  'Force dark appearance on websites (MV3). Heavy color work runs in Rust/WebAssembly; global, per-site rules.' as const
