/** 本地存储里是否启用强制暗色的键（单一真相来源）。 */
export const STORAGE_KEY_ENABLED = 'change-dark:enabled'

/** 标记在根元素上，便于样式与调试识别扩展已注入。 */
export const ROOT_ATTR = 'data-change-dark-root'

/** 注入的样式节点 id，避免重复插入。 */
export const STYLE_ELEMENT_ID = 'change-dark-style'

/** 注入到页面的自定义属性：由 WASM 计算的页面背景色。 */
export const CSS_VAR_PAGE_BG = '--cd-page-bg'

/** 注入到页面的自定义属性：由 WASM 计算的建议前景色。 */
export const CSS_VAR_PAGE_FG = '--cd-page-fg'
