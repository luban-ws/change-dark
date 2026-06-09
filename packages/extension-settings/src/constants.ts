/** 本地存储 schema 版本键（从 1 起递增）。 */
export const STORAGE_KEY_SCHEMA_VERSION = 'change-dark:schema-version'

/** 全局主开关语义：`auto` | `on` | `off`（RFC 004）。 */
export const STORAGE_KEY_POLICY = 'change-dark:policy'

/**
 * 遗留布尔开关；迁移后由后台删除，读路径仍兼容直至字段消失。
 * @deprecated 请使用 `STORAGE_KEY_POLICY`
 */
export const STORAGE_KEY_ENABLED = 'change-dark:enabled'

/**
 * RFC 009 / 017：站点列表真源为 `STORAGE_KEY_SITE_LIST`（`SiteListStateV2`）；此键名为历史占位。
 * @deprecated 请使用 `STORAGE_KEY_SITE_LIST`
 */
export const STORAGE_KEY_ORIGIN_OVERRIDES = 'change-dark:origin-overrides'

/** 站点列表（`SiteListStateV2`：模式 + glob/正则/精确），RFC 009 / 017。 */
export const STORAGE_KEY_SITE_LIST = 'change-dark:site-list'

/** 列表内站点 **不** 套用强制暗色（原 denylist 语义）。 */
export const SITE_LIST_MODE_NOT_INVERT_LISTED = 'not-invert-listed' as const

/** 仅列表内站点套用强制暗色（allowlist）。 */
export const SITE_LIST_MODE_INVERT_LISTED_ONLY = 'invert-listed-only' as const

export type SiteListMode =
  | typeof SITE_LIST_MODE_NOT_INVERT_LISTED
  | typeof SITE_LIST_MODE_INVERT_LISTED_ONLY

/** RFC 016：按 origin 的主题模式 / 滤镜覆盖（`SiteOverridesStateV1`）。 */
export const STORAGE_KEY_SITE_OVERRIDES = 'change-dark:site-overrides' as const

/** RFC 018：全局字体与文本描边（`TypographyStateV1`）。 */
export const STORAGE_KEY_TYPOGRAPHY = 'change-dark:typography' as const

/** RFC 019：每站自定义 CSS（`SiteCustomCssStateV1`）。 */
export const STORAGE_KEY_SITE_CUSTOM_CSS = 'change-dark:site-custom-css' as const

/** 全局主题滤镜（`ThemeFiltersStateV1`），RFC 011。 */
export const STORAGE_KEY_THEME_FILTERS = 'change-dark:theme-filters'

/** 主题引擎：仅 Dynamic 逐规则改色（RFC 031）。 */
export const STORAGE_KEY_THEME_MODE = 'change-dark:theme-mode'

/** @deprecated 存储兼容；产品仅 Dynamic，读路径恒为 `dynamic`。 */
export const THEME_MODE_DYNAMIC = 'dynamic' as const

export type ThemeMode = typeof THEME_MODE_DYNAMIC

/** 网页强制暗色时的配色：`dark`（WASM）| `solarized-dark`。 */
export const STORAGE_KEY_PAGE_PALETTE = 'change-dark:page-palette' as const

/** RFC 006：单次采样最多访问的元素节点数（可配置）。 */
export const STORAGE_KEY_SAMPLING_MAX_NODES = 'change-dark:sampling-max-nodes'

/** RFC 006：单次采样时间墙（毫秒，可配置）。 */
export const STORAGE_KEY_SAMPLING_MAX_MS = 'change-dark:sampling-max-ms'

/** 默认最大采样节点数（偏保守，避免弱机卡顿）。 */
export const DEFAULT_SAMPLING_MAX_NODES = 120

/** 默认采样时间墙（毫秒）。 */
export const DEFAULT_SAMPLING_MAX_MS = 35

/** RFC 024：Auto 模式原生深色检测亮度阈值（0-255，越小越严格）。 */
export const STORAGE_KEY_AUTO_DARK_THRESHOLD = 'change-dark:auto-dark-threshold'

/** 默认 Auto 模式深色检测阈值。 */
export const DEFAULT_AUTO_DARK_THRESHOLD = 80

/** RFC 006 回退：与 v1 固定「纸面」底一致（`mix` 前）。 */
export const STATIC_FALLBACK_RGB = [248, 250, 252] as const

/** 向黑色混合强度，与历史行为一致。 */
export const MIX_TOWARD_BLACK_AMOUNT = 0.88

export const POLICY_AUTO = 'auto' as const
export const POLICY_ON = 'on' as const
export const POLICY_OFF = 'off' as const

export type GlobalPolicy = typeof POLICY_AUTO | typeof POLICY_ON | typeof POLICY_OFF

/** `manifest.commands` 名称，须与 background `onCommand` 一致（RFC 010）。 */
export const COMMAND_TOGGLE_GLOBAL = 'toggle-global-dark' as const

export const COMMAND_TOGGLE_CURRENT_SITE = 'toggle-current-site' as const

/** 标记在根元素上，便于样式与调试识别扩展已注入。 */
export const ROOT_ATTR = 'data-change-dark-root'

/** RFC 031 P1-3：内联 style 改色前备份原始 `style` 属性，便于重绘/关闭时还原。 */
export const INLINE_STYLE_BACKUP_ATTR = 'data-change-dark-inline-backup'

/** RFC 031 P1-5：位图背景改色前备份（legacy：整元素 filter）。 */
export const BG_IMAGE_FILTER_BACKUP_ATTR = 'data-change-dark-bg-filter-backup'

/** RFC 031 P1-5：background-image 替换前备份。 */
export const BG_IMAGE_STYLE_BACKUP_ATTR = 'data-change-dark-bg-image-backup'

/** 替换 background 时创建的 blob URL，restore 时 revoke。 */
export const BG_IMAGE_BLOB_URL_ATTR = 'data-change-dark-bg-blob-url'

/** `<img>` 压暗前备份 filter。 */
export const IMG_DARKEN_FILTER_BACKUP_ATTR = 'data-change-dark-img-filter-backup'

/** 注入的样式节点 id，避免重复插入。 */
export const STYLE_ELEMENT_ID = 'change-dark-style'

/** RFC 018：字体与描边第二条样式节点（与主暗色样式分离，便于单独移除）。 */
export const STYLE_ELEMENT_TYPOGRAPHY_ID = 'change-dark-typography-style'

/** RFC 019：每站用户 CSS 第三条样式节点。 */
export const STYLE_ELEMENT_CUSTOM_CSS_ID = 'change-dark-site-custom-css'

/** 注入到页面的自定义属性：由 WASM 计算的页面背景色。 */
export const CSS_VAR_PAGE_BG = '--cd-page-bg'

/** 注入到页面的自定义属性：由 WASM 计算的建议前景色。 */
export const CSS_VAR_PAGE_FG = '--cd-page-fg'

/** 内容脚本与迁移逻辑共同关心的 local 键（顺序无关）。 */
export const STORAGE_KEYS_AFFECTING_INJECTION: readonly string[] = [
  STORAGE_KEY_SCHEMA_VERSION,
  STORAGE_KEY_POLICY,
  STORAGE_KEY_ENABLED,
  STORAGE_KEY_SAMPLING_MAX_NODES,
  STORAGE_KEY_SAMPLING_MAX_MS,
  STORAGE_KEY_SITE_LIST,
  STORAGE_KEY_SITE_OVERRIDES,
  STORAGE_KEY_THEME_FILTERS,
  STORAGE_KEY_PAGE_PALETTE,
  STORAGE_KEY_TYPOGRAPHY,
  STORAGE_KEY_SITE_CUSTOM_CSS,
  STORAGE_KEY_AUTO_DARK_THRESHOLD,
]
