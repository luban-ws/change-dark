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
 * RFC 009 / 017：站点列表 JSON（`{ denylist: string[] }`）；与「仅 invert 列表」等模式扩展兼容。
 * @deprecated 旧占位名，请使用 `STORAGE_KEY_SITE_LIST`
 */
export const STORAGE_KEY_ORIGIN_OVERRIDES = 'change-dark:origin-overrides'

/** 站点列表状态（`SiteListStateV1`），RFC 009。 */
export const STORAGE_KEY_SITE_LIST = 'change-dark:site-list'

/** 全局主题滤镜（`ThemeFiltersStateV1`），RFC 011。 */
export const STORAGE_KEY_THEME_FILTERS = 'change-dark:theme-filters'

/** RFC 006：单次采样最多访问的元素节点数（可配置）。 */
export const STORAGE_KEY_SAMPLING_MAX_NODES = 'change-dark:sampling-max-nodes'

/** RFC 006：单次采样时间墙（毫秒，可配置）。 */
export const STORAGE_KEY_SAMPLING_MAX_MS = 'change-dark:sampling-max-ms'

/** 默认最大采样节点数（偏保守，避免弱机卡顿）。 */
export const DEFAULT_SAMPLING_MAX_NODES = 120

/** 默认采样时间墙（毫秒）。 */
export const DEFAULT_SAMPLING_MAX_MS = 35

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

/** 注入的样式节点 id，避免重复插入。 */
export const STYLE_ELEMENT_ID = 'change-dark-style'

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
  STORAGE_KEY_THEME_FILTERS,
]
