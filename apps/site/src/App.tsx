/** 落地页：介绍扩展与仓库链接；静态资源路径依赖 Vite base（GitHub Pages 子路径兼容）。 */
export function App() {
  const repo = import.meta.env.VITE_GITHUB_REPO
  const repoUrl = repo ? `https://github.com/${repo}` : 'https://github.com'

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">嫦娥 · Change Dark</p>
        <h1>为网页强制暗色</h1>
        <p className="lede">
          Chromium 扩展，核心计算走 Rust / WebAssembly。本页由 React + Vite 构建，经 GitHub Actions 发布到
          GitHub Pages。
        </p>
        <div className="actions">
          <a className="btn primary" href={repoUrl} rel="noreferrer" target="_blank">
            查看仓库
          </a>
          <a className="btn" href={`${import.meta.env.BASE_URL}#install`}>
            本地安装说明
          </a>
        </div>
      </header>

      <section id="install" className="card">
        <h2>加载未打包扩展</h2>
        <ol>
          <li>在仓库根目录执行 <code>pnpm install</code> 与 <code>pnpm run build</code>。</li>
          <li>Chrome → 扩展程序 → 开发者模式 →「加载已解压的扩展程序」。</li>
          <li>
            选择目录 <code>apps/chrome/dist</code>（勿选 monorepo 根目录）。
          </li>
        </ol>
      </section>
    </div>
  )
}
