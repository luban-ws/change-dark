/**
 * 颜色算法仅在 Rust crate `dark_color_utils` 中实现；本入口供 monorepo 统一经 Vite 打包占位/元数据。
 * 扩展运行时请依赖 `@change-dark/dark-engine`（WASM），而非本包。
 */
export const DARK_COLOR_UTILS_RUST_ONLY = true as const
