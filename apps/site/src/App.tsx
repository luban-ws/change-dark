import { useTranslation } from 'react-i18next'
import { IconBookOpen, IconGithub, IconLayers, IconMoon } from './icons'
import { Globe } from 'lucide-react'
import pkg from '../package.json'

export function App() {
  const { t, i18n } = useTranslation()
  const repo = import.meta.env.VITE_GITHUB_REPO as string | undefined
  const repoUrl = repo ? `https://github.com/${repo}` : 'https://github.com'
  const base = import.meta.env.BASE_URL
  const screenshotSrc = `${base}popup-options.png`

  const NAV_LINKS = [
    { id: 'overview', label: t('overview') },
    { id: 'tech', label: t('tech') },
    { id: 'screenshot', label: t('screenshot') },
    { id: 'features', label: t('features') },
  ] as const

  const toggleLanguage = () => {
    void i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }

  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="Sections">
          <div className="nav-left">
            <a className="nav-brand" href={base}>
              <IconMoon className="nav-brand-icon" width={22} height={22} />
              <span className="nav-brand-text">{t('brand')}</span>
            </a>
            <ul className="nav-links">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`${base}#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
          <button className="lang-switcher" onClick={toggleLanguage} aria-label="Switch Language">
            <Globe width={16} height={16} />
            <span>{i18n.language === 'zh' ? 'English' : '中文'}</span>
          </button>
        </nav>
      </header>

      <main id="main" className="page">
        <section id="overview" className="hero">
          <div className="brand-row">
            <div className="brand-icon" aria-hidden="true">
              <IconMoon className="brand-moon-svg" width={28} height={28} />
            </div>
            <div>
              <p className="eyebrow font-mono">Selena v{pkg.version} · Extension</p>
              <h1>{t('fullName')}</h1>
              <p className="tagline">{t('tagline')}</p>
            </div>
          </div>
          <p className="lede">
            {t('heroDesc1')}<strong>{t('heroDesc2')}</strong>{t('heroDesc3')}
            <strong>{t('heroDesc4')}</strong>{t('heroDesc5')}
          </p>
          <div className="actions">
            <a className="btn primary" href={repoUrl} rel="noreferrer" target="_blank">
              <IconGithub width={18} height={18} />
              {t('viewRepo')}
            </a>
            <a className="btn btn-ghost" href={`${base}#screenshot`}>
              {t('preview')}
            </a>
          </div>
        </section>

        <section id="tech" className="section-block">
          <div className="section-head">
            <IconLayers className="section-icon" width={22} height={22} aria-hidden />
            <h2 className="section-title">{t('techTitle')}</h2>
            <p className="section-lede">{t('techDesc')}</p>
          </div>
          <div className="tech-grid">
            <article className="card tech-card">
              <h3 className="tech-card-title">{t('extensionTitle')}</h3>
              <p className="tech-card-body">{t('extensionBody')}</p>
            </article>
            <article className="card tech-card">
              <h3 className="tech-card-title">{t('rustTitle')}</h3>
              <p className="tech-card-body">{t('rustBody')}</p>
            </article>
            <article className="card tech-card">
              <h3 className="tech-card-title">{t('siteTitle')}</h3>
              <p className="tech-card-body">{t('siteBody')}</p>
            </article>
          </div>
        </section>

        <section id="screenshot" className="card screenshot-card section-tight">
          <h2>{t('screenshotTitle')}</h2>
          <p className="card-desc">{t('screenshotDesc')}</p>
          <figure className="figure">
            <img
              src={screenshotSrc}
              alt={t('screenshotTitle')}
              className="screenshot"
            />
          </figure>
        </section>

        <section id="features" className="section-block">
          <div className="section-head">
            <IconBookOpen className="section-icon" width={22} height={22} aria-hidden />
            <h2 className="section-title">{t('featureTitle')}</h2>
            <p className="section-lede">{t('featureLede')}</p>
          </div>
          <div className="features-grid">
            <article className="card feature">
              <h3>{t('featGlobalTitle')}</h3>
              <p>{t('featGlobalBody')}</p>
            </article>
            <article className="card feature">
              <h3>{t('featSiteTitle')}</h3>
              <p>{t('featSiteBody')}</p>
            </article>
            <article className="card feature">
              <h3>{t('featThemeTitle')}</h3>
              <p>{t('featThemeBody')}</p>
            </article>
            <article className="card feature">
              <h3>{t('featWasmTitle')}</h3>
              <p>{t('featWasmBody')}</p>
            </article>
          </div>
        </section>

        <footer className="footer">
          <p>
            {t('footer1')} ·{' '}
            <a href={`${base}privacy.html`} rel="noreferrer">
              {t('privacy')}
            </a>
          </p>
        </footer>
      </main>
    </>
  )
}
