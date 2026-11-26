/**
 * RFC 0037 Task 3 & Task 4：MAIN-world 无权限轻量通知 hook。
 *
 * 注意：不得包含任何 `import` 或 `export`（Rollup chunk 必须 zero exports，
 * 以便 CRXJS 直接打包为同步自执行 `document_start` 脚本，无异步 loader）。
 */
;(function () {
  var HOOK_FLAG = '__changeDarkShadowHookInstalled'
  var win = window as unknown as Record<string, unknown>
  if (win[HOOK_FLAG]) return
  win[HOOK_FLAG] = true

  var SHADOW_ATTACHED_EVENT = 'change-dark:open-shadow-attached'
  var CSSOM_WATCH_START_EVENT = 'change-dark:cssom-watch-start'
  var CSSOM_WATCH_STOP_EVENT = 'change-dark:cssom-watch-stop'
  var CSSOM_MUTATED_EVENT = 'change-dark:cssom-mutated'
  var ROOT_ATTR = 'data-change-dark-root'
  var CSSOM_METHODS = ['insertRule', 'deleteRule', 'replace', 'replaceSync'] as const

  var origAttachShadow = Element.prototype.attachShadow
  if (typeof origAttachShadow === 'function') {
    Element.prototype.attachShadow = function (
      this: Element,
      init: ShadowRootInit,
    ): ShadowRoot {
      var shadow = origAttachShadow.call(this, init)
      try {
        if (shadow && shadow.mode === 'open') {
          this.dispatchEvent(
            new CustomEvent(SHADOW_ATTACHED_EVENT, {
              bubbles: true,
              composed: true,
            }),
          )
        }
      } catch {
        // 绝不向页面代码抛出扩展通知异常
      }
      return shadow
    }
  }

  var savedProtoDescriptors: Partial<
    Record<(typeof CSSOM_METHODS)[number], PropertyDescriptor>
  > = {}
  var cssomWatchActive = false

  function notifyCssomMutated(): void {
    try {
      var rootEl = document.documentElement
      if (!rootEl || !rootEl.hasAttribute(ROOT_ATTR)) return
      document.dispatchEvent(new CustomEvent(CSSOM_MUTATED_EVENT))
    } catch {
      // 忽略异常
    }
  }

  function installCssomWatch(): void {
    if (cssomWatchActive) return
    if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype) return
    var proto = CSSStyleSheet.prototype as unknown as Record<string, unknown>

    for (var i = 0; i < CSSOM_METHODS.length; i += 1) {
      var method = CSSOM_METHODS[i]!
      var desc = Object.getOwnPropertyDescriptor(proto, method)
      if (!desc || typeof desc.value !== 'function') continue
      savedProtoDescriptors[method] = desc

      ;(function (m: (typeof CSSOM_METHODS)[number], origFn: (...args: unknown[]) => unknown) {
        var wrapped = function (this: CSSStyleSheet): unknown {
          var args: unknown[] = []
          for (var a = 0; a < arguments.length; a += 1) {
            args.push(arguments[a])
          }
          var result = origFn.apply(this, args)
          if (m === 'replace') {
            return Promise.resolve(result).then(function (resolved) {
              notifyCssomMutated()
              return resolved
            })
          }
          notifyCssomMutated()
          return result
        }
        try {
          Object.defineProperty(proto, m, {
            configurable: true,
            enumerable: desc.enumerable,
            writable: true,
            value: wrapped,
          })
        } catch {
          delete savedProtoDescriptors[m]
        }
      })(method, desc.value as (...args: unknown[]) => unknown)
    }

    cssomWatchActive = true
  }

  function uninstallCssomWatch(): void {
    if (!cssomWatchActive) return
    if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype) return
    var proto = CSSStyleSheet.prototype as unknown as Record<string, unknown>

    for (var i = 0; i < CSSOM_METHODS.length; i += 1) {
      var method = CSSOM_METHODS[i]!
      var desc = savedProtoDescriptors[method]
      if (!desc) continue
      try {
        Object.defineProperty(proto, method, desc)
      } catch {
        // 忽略不可恢复情况
      }
      delete savedProtoDescriptors[method]
    }

    cssomWatchActive = false
  }

  document.addEventListener(CSSOM_WATCH_START_EVENT, installCssomWatch)
  document.addEventListener(CSSOM_WATCH_STOP_EVENT, uninstallCssomWatch)
})()
