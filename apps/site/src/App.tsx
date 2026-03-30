/** 落地页：介绍扩展、选项 UI 截图与仓库 / RFC 链接；静态资源见 `public/`（Vite base 兼容 GitHub Pages）。 */

const RFC = {
  globalSwitch: 'docs/rfc/008-global-on-off-policy.md',
  onlyFor: 'docs/rfc/016-only-for-per-site-overrides.md',
  dynamic: 'docs/rfc/012-theme-mode-dynamic.md',
  pipeline: 'docs/rfc/023-dynamic-color-engine-pipeline.md',
  wasmApi: 'docs/rfc/005-wasm-batch-color-api.md',
  sampling: 'docs/rfc/006-content-script-sampling-budget-fallback.md',
} as const

function rfcLink(repo: string | undefined, repoUrl: string, path: string): string {
  if (!repo) {
    return '#'
  }
  return `${repoUrl}/blob/main/${path}`
}

export function App() {
  const repo = import.meta.env.VITE_GITHUB_REPO as string | undefined
  const repoUrl = repo ? `https://github.com/${repo}` : 'https://github.com'
  const base = import.meta.env.BASE_URL
  const screenshotSrc = `${base}popup-options.png`

  return (
    <div className="page">
      <header className="hero">
        <div className="brand-row">
          <div className="brand-icon" aria-hidden="true">
            <span className="moon" />
          </div>
          <div>
            <p className="eyebrow">嫦娥 · Change Dark</p>
            <h1>嫦娥 Change Dark</h1>
            <p className="tagline">强制暗色 · 在此调整全局策略、主题与站点规则</p>
          </div>
        </div>
        <p className="lede">
          Chromium 扩展：在任意站点注入暗色样式；核心配色与聚合在 <strong>Rust / WebAssembly</strong> 中完成。下方界面与扩展
          Popup / Options 一致，便于在网页上向他人说明能力边界。
        </p>
        <div className="actions">
          <a className="btn primary" href={repoUrl} rel="noreferrer" target="_blank">
            查看仓库
          </a>
          <a className="btn" href={`${base}#screenshot`}>
            界面预览
          </a>
          <a className="btn" href={`${base}#install`}>
            本地安装
          </a>
        </div>
      </header>

      <section id="screenshot" className="card screenshot-card">
        <h2>选项页一览</h2>
        <p className="card-desc">
          与扩展内选项相同：全局开关、仅当前站覆盖、主题模式（Dynamic / Static 等）及 WASM 着色管线说明见各篇 RFC。
        </p>
        <figure className="figure">
          <img
            src={screenshotSrc}
            alt="嫦娥 Change Dark 扩展选项界面：全局开关、仅当前站、主题模式等分段控件"
            width={720}
            height={420}
            loading="lazy"
            decoding="async"
            className="screenshot"
          />
          <figcaption>Popup / Options 截图（与本页同源资源 <code>public/popup-options.png</code>）</figcaption>
        </figure>
      </section>

      <section id="features" className="features">
        <h2 className="features-title">能力要点（与界面对照）</h2>

        <article className="card feature">
          <h3>全局开关（RFC 008）</h3>
          <p>
            「关闭」时不注入样式并移除已注入效果；与工具栏按钮共用同一策略。可选自动 / 开启 / 关闭。
          </p>
          <a href={rfcLink(repo, repoUrl, RFC.globalSwitch)} rel="noreferrer" target="_blank">
            阅读 RFC 008 →
          </a>
        </article>

        <article className="card feature">
          <h3>仅当前站（RFC 016）</h3>
          <p>
            「全局」下写入全站默认；「仅当前站」对当前 origin 写入覆盖，未写的项继承全局。需 http/https 页面。
          </p>
          <a href={rfcLink(repo, repoUrl, RFC.onlyFor)} rel="noreferrer" target="_blank">
            阅读 RFC 016 →
          </a>
        </article>

        <article className="card feature">
          <h3>主题模式与 WASM</h3>
          <p>
            <strong>Dynamic</strong>：视口采样 + 亮度聚类 / Otsu 候选 + 暗分位回退（
            <a href={rfcLink(repo, repoUrl, RFC.pipeline)} rel="noreferrer" target="_blank">
              RFC 023
            </a>
            ）。<strong>Static</strong>：固定基色。滤镜类模式见 RFC 013/014。底层 API 见{' '}
            <a href={rfcLink(repo, repoUrl, RFC.wasmApi)} rel="noreferrer" target="_blank">
              RFC 005
            </a>
            、采样见{' '}
            <a href={rfcLink(repo, repoUrl, RFC.sampling)} rel="noreferrer" target="_blank">
              RFC 006
            </a>
            。
          </p>
          <a href={rfcLink(repo, repoUrl, RFC.dynamic)} rel="noreferrer" target="_blank">
            阅读 RFC 012（Dynamic）→
          </a>
        </article>
      </section>

      <section id="install" className="card">
        <h2>加载未打包扩展</h2>
        <ol>
          <li>
            在仓库根目录执行 <code>pnpm install</code> 与 <code>pnpm run build</code>。
          </li>
          <li>Chrome → 扩展程序 → 开发者模式 →「加载已解压的扩展程序」。</li>
          <li>
            选择目录 <code>apps/chrome/dist</code>（勿选 monorepo 根目录）。
          </li>
        </ol>
      </section>

      <footer className="footer">
        <p>
          本页由 <code>apps/site</code> 构建，部署方式见{' '}
          <a href={rfcLink(repo, repoUrl, 'docs/rfc/020-github-pages-site.md')} rel="noreferrer" target="_blank">
            RFC 020
          </a>
          。
        </p>
      </footer>
    </div>
  )
}
