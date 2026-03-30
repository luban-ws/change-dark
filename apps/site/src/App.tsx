/** 落地页：文档型结构 + RFC 索引；设计参照 ui-ux-pro-max（IBM Plex / JetBrains、极简层级、深色适配）。 */

import { IconBookOpen, IconGithub, IconLayers, IconMoon } from './icons'

const RFC = {
  globalSwitch: 'docs/rfc/008-global-on-off-policy.md',
  onlyFor: 'docs/rfc/016-only-for-per-site-overrides.md',
  dynamic: 'docs/rfc/012-theme-mode-dynamic.md',
  pipeline: 'docs/rfc/023-dynamic-color-engine-pipeline.md',
  wasmApi: 'docs/rfc/005-wasm-batch-color-api.md',
  sampling: 'docs/rfc/006-content-script-sampling-budget-fallback.md',
  filterCss: 'docs/rfc/013-theme-mode-filter-css-invert.md',
  filterPlus: 'docs/rfc/014-theme-mode-filter-plus-svg.md',
  staticMode: 'docs/rfc/015-theme-mode-static.md',
} as const

function rfcLink(repo: string | undefined, repoUrl: string, path: string): string {
  if (!repo) {
    return '#'
  }
  return `${repoUrl}/blob/main/${path}`
}

const NAV_LINKS = [
  { id: 'overview', label: '概览' },
  { id: 'tech', label: '技术栈' },
  { id: 'screenshot', label: '界面' },
  { id: 'features', label: '能力' },
  { id: 'pipeline', label: '配色管线' },
  { id: 'install', label: '安装' },
] as const

export function App() {
  const repo = import.meta.env.VITE_GITHUB_REPO as string | undefined
  const repoUrl = repo ? `https://github.com/${repo}` : 'https://github.com'
  const base = import.meta.env.BASE_URL
  const screenshotSrc = `${base}popup-options.png`

  return (
    <>
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <header className="site-header">
        <nav className="site-nav" aria-label="页面章节">
          <a className="nav-brand" href={base}>
            <IconMoon className="nav-brand-icon" width={22} height={22} />
            <span className="nav-brand-text">嫦娥</span>
          </a>
          <ul className="nav-links">
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <a href={`${base}#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" className="page">
        <section id="overview" className="hero">
          <div className="brand-row">
            <div className="brand-icon" aria-hidden="true">
              <IconMoon className="brand-moon-svg" width={28} height={28} />
            </div>
            <div>
              <p className="eyebrow font-mono">嫦娥 · Change Dark</p>
              <h1>嫦娥 Change Dark</h1>
              <p className="tagline">强制暗色 · 在此调整全局策略、主题与站点规则</p>
            </div>
          </div>
          <p className="lede">
            Chromium <strong>Manifest V3</strong> 扩展：在任意站点注入暗色样式；页面背景与代表色聚合在{' '}
            <strong>Rust / WebAssembly</strong> 中计算，减少主线程热循环。Monorepo 使用 <span className="font-mono">pnpm</span>{' '}
            与 Turbo 编排构建。
          </p>
          <ul className="pill-row" aria-label="技术关键词">
            <li className="pill">Rust</li>
            <li className="pill">WebAssembly</li>
            <li className="pill">MV3</li>
            <li className="pill">RFC 驱动</li>
          </ul>
          <div className="actions">
            <a className="btn primary" href={repoUrl} rel="noreferrer" target="_blank">
              <IconGithub width={18} height={18} />
              查看仓库
            </a>
            <a className="btn btn-ghost" href={`${base}#screenshot`}>
              界面预览
            </a>
            <a className="btn btn-ghost" href={`${base}#install`}>
              本地安装
            </a>
          </div>
        </section>

        <section id="tech" className="section-block">
          <div className="section-head">
            <IconLayers className="section-icon" width={22} height={22} aria-hidden />
            <h2 className="section-title">技术栈</h2>
            <p className="section-lede">
              宿主与内容脚本在 TypeScript；重计算与颜色聚类在 WASM，由 <span className="font-mono">wasm-pack</span> 与 Vite 打入扩展包。
            </p>
          </div>
          <div className="tech-grid">
            <article className="card tech-card">
              <h3 className="tech-card-title">Chromium 扩展</h3>
              <p className="tech-card-body">
                Content script 在预算内采样 computed <code>background-color</code>，经 <span className="font-mono">@luban-ws/dark-engine</span>{' '}
                调用；与 Popup / Options 共用存储键。
              </p>
            </article>
            <article className="card tech-card">
              <h3 className="tech-card-title">Rust · WASM</h3>
              <p className="tech-card-body">
                <span className="font-mono">dark_color_utils</span>：WCAG 相对亮度、亮度轴 Lloyd、Otsu 候选、暗分位回退（详见{' '}
                <a href={rfcLink(repo, repoUrl, RFC.pipeline)} rel="noreferrer" target="_blank">
                  RFC 023
                </a>
                ）。
              </p>
            </article>
            <article className="card tech-card">
              <h3 className="tech-card-title">本落地页</h3>
              <p className="tech-card-body">
                React + Vite；GitHub Actions 仅构建 <span className="font-mono">apps/site</span> 并发布至 Pages（
                <a href={rfcLink(repo, repoUrl, 'docs/rfc/020-github-pages-site.md')} rel="noreferrer" target="_blank">
                  RFC 020
                </a>
                ）。
              </p>
            </article>
          </div>
        </section>

        <section id="screenshot" className="card screenshot-card section-tight">
          <h2>选项页一览</h2>
          <p className="card-desc">
            与扩展内 Popup / Options 一致：全局开关、仅当前站、主题模式与页面配色等；以下为实际截图，便于对外说明产品边界。
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
            <figcaption>
              资源路径 <code className="font-mono">public/popup-options.png</code>，随构建复制到 <code className="font-mono">dist/</code>。
            </figcaption>
          </figure>
        </section>

        <section id="features" className="section-block">
          <div className="section-head">
            <IconBookOpen className="section-icon" width={22} height={22} aria-hidden />
            <h2 className="section-title">能力要点</h2>
            <p className="section-lede">与界面对照；完整行为以各篇 RFC Implementation 为准。</p>
          </div>
          <div className="features-grid">
            <article className="card feature">
              <h3>全局开关（RFC 008）</h3>
              <p>
                「关闭」时不注入样式并移除已注入效果；与工具栏按钮共用同一策略。支持自动 / 开启 / 关闭。
              </p>
              <a href={rfcLink(repo, repoUrl, RFC.globalSwitch)} rel="noreferrer" target="_blank">
                RFC 008
              </a>
            </article>
            <article className="card feature">
              <h3>仅当前站（RFC 016）</h3>
              <p>
                「全局」写入全站默认；「仅当前站」对当前 origin 覆盖，未写的项继承全局。需 http/https 页面。
              </p>
              <a href={rfcLink(repo, repoUrl, RFC.onlyFor)} rel="noreferrer" target="_blank">
                RFC 016
              </a>
            </article>
            <article className="card feature">
              <h3>主题模式</h3>
              <p>
                <strong>Dynamic</strong>：采样 + WASM 聚合（
                <a href={rfcLink(repo, repoUrl, RFC.pipeline)} rel="noreferrer" target="_blank">
                  RFC 023
                </a>
                ）。<strong>Static</strong>（
                <a href={rfcLink(repo, repoUrl, RFC.staticMode)} rel="noreferrer" target="_blank">
                  RFC 015
                </a>
                ）。<strong>Filter</strong>（
                <a href={rfcLink(repo, repoUrl, RFC.filterCss)} rel="noreferrer" target="_blank">
                  013
                </a>
                {' / '}
                <a href={rfcLink(repo, repoUrl, RFC.filterPlus)} rel="noreferrer" target="_blank">
                  014
                </a>
                ）。
              </p>
              <a href={rfcLink(repo, repoUrl, RFC.dynamic)} rel="noreferrer" target="_blank">
                RFC 012 Dynamic
              </a>
            </article>
            <article className="card feature">
              <h3>WASM API · 采样</h3>
              <p>
                批亮度、<span className="font-mono">kMeansDarkerCentroid</span>、<span className="font-mono">mix_toward_black</span> 等见{' '}
                <a href={rfcLink(repo, repoUrl, RFC.wasmApi)} rel="noreferrer" target="_blank">
                  RFC 005
                </a>
                ；视口采样与回退见{' '}
                <a href={rfcLink(repo, repoUrl, RFC.sampling)} rel="noreferrer" target="_blank">
                  RFC 006
                </a>
                。
              </p>
            </article>
          </div>
        </section>

        <section id="pipeline" className="card pipeline-card">
          <h2>Dynamic 配色管线（摘要）</h2>
          <p className="card-desc">
            输入为有限个背景色样本，非整页位图；目标是在「浅顶栏 + 深主区」类版式下让基色落在暗侧。
          </p>
          <ol className="pipeline-steps">
            <li>
              <strong className="font-mono">① 采样</strong>：视口多点 <code>elementsFromPoint</code> 与文档树 DFS，受时间与节点数预算约束。
            </li>
            <li>
              <strong className="font-mono">② 聚合</strong>：亮度轴 Lloyd、暗簇中位数、Otsu 候选取更暗、条件暗分位回退。
            </li>
            <li>
              <strong className="font-mono">③ 后处理</strong>：向黑混合与建议前景色（RFC 005）。
            </li>
          </ol>
          <p className="pipeline-more">
            <a href={rfcLink(repo, repoUrl, RFC.pipeline)} rel="noreferrer" target="_blank">
              阅读 RFC 023 全文
            </a>
          </p>
        </section>

        <section id="install" className="card install-card">
          <h2>加载未打包扩展</h2>
          <ol className="install-list">
            <li>
              在仓库根目录执行 <code className="font-mono">pnpm install</code> 与 <code className="font-mono">pnpm run build</code>。
            </li>
            <li>Chrome → 扩展程序 → 开发者模式 →「加载已解压的扩展程序」。</li>
            <li>
              选择目录 <code className="font-mono">apps/chrome/dist</code>（勿选 monorepo 根目录）。
            </li>
          </ol>
        </section>

        <footer className="footer">
          <p>
            MIT License（以仓库为准）· 本页由 <code className="font-mono">apps/site</code> 构建 ·{' '}
            <a href={rfcLink(repo, repoUrl, 'docs/rfc/020-github-pages-site.md')} rel="noreferrer" target="_blank">
              RFC 020
            </a>
          </p>
        </footer>
      </main>
    </>
  )
}
