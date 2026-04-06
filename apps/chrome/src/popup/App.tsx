import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePopupState } from './hooks/usePopupState'
import {
  POLICY_AUTO, POLICY_OFF, POLICY_ON, 
  THEME_MODE_DYNAMIC, THEME_MODE_STATIC, THEME_MODE_FILTER_CSS, THEME_MODE_FILTER_PLUS,
} from "@luban-ws/shared"
import { shouldExposeFilterPlusMode } from "@luban-ws/shared"
import { Toggle } from './components/Toggle'
import { ThemeFiltersPanel } from './components/ThemeFiltersPanel'
import { TypographyPanel } from './components/TypographyPanel'
import { SiteToolsPanel } from './components/SiteToolsPanel'
import qrCodeImgUrl from './qr-code.png'

export default function App() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<'main' | 'support'>('main')
  
  const { 
    origin, hostnameTitle, editScope, hasSiteOverride, isSiteForcedDark, 
    policy, themeMode, filters, palette, typography, siteCss, siteList, actions 
  } = usePopupState()

  const isFirefoxUiGateActive = !shouldExposeFilterPlusMode()

  return (
    <main className="popup-root">
      <header className="cd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex' }}>
          <svg className="cd-header__mark" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" style={{ marginRight: '8px', color: 'var(--cd-accent, #58a6ff)' }}>
            <path fill="currentColor" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <div className="cd-header__text">
            <h1 className="popup-title">{t('extName', 'Selena')}</h1>
            <p className="cd-subtitle">{t('extSubtitle', 'Force dark rules')}</p>
          </div>
        </div>
        <div style={{ marginLeft: '12px', marginTop: '4px', flexShrink: 0 }}>
          <select 
            value={i18n.language === 'zh_CN' ? 'zh_CN' : 'en'} 
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ 
              padding: '2px 6px', fontSize: '12px', background: 'transparent', 
              color: 'inherit', border: '1px solid var(--cd-border, #ccc)', 
              borderRadius: '4px', cursor: 'pointer' 
            }}
          >
            <option value="zh_CN" style={{ color: 'initial' }}>中文</option>
            <option value="en" style={{ color: 'initial' }}>EN</option>
          </select>
        </div>
      </header>

      <div className="cd-tabs">
        <div className="cd-tabs__list">
          <button 
             className={`cd-tabs__tab ${activeTab === 'main' ? 'cd-tabs__tab--active' : ''}`}
             onClick={() => setActiveTab('main')}
          >
             {t('tabSettings', 'Settings')}
          </button>
          <button 
             className={`cd-tabs__tab ${activeTab === 'support' ? 'cd-tabs__tab--active' : ''}`}
             onClick={() => setActiveTab('support')}
          >
             {t('tabSupport', 'Support')}
          </button>
        </div>

        <div className="cd-tab-panels-stack">
          {activeTab === 'main' && (
            <div className="cd-tab-panel">
              
              <fieldset className="cd-panel">
                <legend className="cd-panel__legend">
                  {t('lblCurrentSite', 'Current Site')}
                  <span className="cd-current-site-host" title={origin || ''}>{hostnameTitle || '—'}</span>
                </legend>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <Toggle 
                    disabled={!origin}
                    checked={isSiteForcedDark}
                    onChange={() => actions.toggleCurrentSiteForcedDark()}
                  />
                  <p className="cd-current-site-hint" style={{ fontSize: '12px', flex: 1 }}>
                    {!origin ? t('lblNoOrigin', 'Open a valid web page to enable rules.') : 
                      isSiteForcedDark ? t('lblSiteForced', 'This site is forced dark by site list rules.') : 
                      t('lblSiteNotForced', 'This site follows global dark mode rules.')
                    }
                  </p>
                </div>
              </fieldset>

              <fieldset className="cd-panel policy-fieldset">
                <legend>{t('globalSwitch', 'Global Switch')}</legend>
                <div className="policy-radios cd-segmented cd-segmented--3">
                  <label className="policy-label">
                    <input type="radio" checked={policy === POLICY_AUTO} onChange={() => actions.setPolicy(POLICY_AUTO)} /> <span>{t('lblAuto', 'Auto')}</span>
                  </label>
                  <label className="policy-label">
                    <input type="radio" checked={policy === POLICY_ON} onChange={() => actions.setPolicy(POLICY_ON)} /> <span>{t('lblOn', 'On')}</span>
                  </label>
                  <label className="policy-label">
                    <input type="radio" checked={policy === POLICY_OFF} onChange={() => actions.setPolicy(POLICY_OFF)} /> <span>{t('lblOff', 'Off')}</span>
                  </label>
                </div>
              </fieldset>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="cd-segmented cd-segmented--2" style={{ display: 'inline-flex' }}>
                  <label>
                    <input type="radio" name="scope" value="global" checked={editScope === 'global'} onChange={() => actions.setEditScope('global')} />
                    <span>{t('lblScopeGlobal', 'Global Edit')}</span>
                  </label>
                  <label title={!origin ? t('lblNeedOrigin', 'Need valid origin') : ''}>
                    <input type="radio" name="scope" value="site" checked={editScope === 'site'} disabled={!origin} onChange={() => actions.setEditScope('site')} />
                    <span>{t('lblScopeSite', 'Only Current Site')}</span>
                  </label>
                </div>
                {hasSiteOverride && (
                  <button onClick={() => actions.clearSiteOverride()} style={{ fontSize: '11px', color: 'var(--cd-fg-danger)', background: 'transparent', border: '1px solid currentColor', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>
                    {t('lblClearOverride', 'Clear Site Override')}
                  </button>
                )}
              </div>

              <fieldset className="cd-panel theme-mode-fieldset">
                <legend>{t('themeMode', 'Theme Mode')}</legend>
                <div className="policy-radios cd-radio-list">
                  <label className="policy-label cd-radio-row">
                    <input type="radio" checked={themeMode === THEME_MODE_FILTER_CSS} onChange={() => actions.setThemeMode(THEME_MODE_FILTER_CSS)} />
                    <span className="cd-radio-row__text"><span className="cd-radio-row__title">Filter</span></span>
                  </label>
                  <label className="policy-label cd-radio-row" title={isFirefoxUiGateActive ? t('lblFxGate', 'Disabled on Firefox') : ''}>
                    <input type="radio" checked={themeMode === THEME_MODE_FILTER_PLUS} disabled={isFirefoxUiGateActive} onChange={() => actions.setThemeMode(THEME_MODE_FILTER_PLUS)} />
                    <span className="cd-radio-row__text"><span className="cd-radio-row__title">Filter+</span></span>
                  </label>
                  <label className="policy-label cd-radio-row">
                    <input type="radio" checked={themeMode === THEME_MODE_DYNAMIC} onChange={() => actions.setThemeMode(THEME_MODE_DYNAMIC)} />
                    <span className="cd-radio-row__text"><span className="cd-radio-row__title">Dynamic (Expr)</span></span>
                  </label>
                  <label className="policy-label cd-radio-row">
                    <input type="radio" checked={themeMode === THEME_MODE_STATIC} onChange={() => actions.setThemeMode(THEME_MODE_STATIC)} />
                    <span className="cd-radio-row__text"><span className="cd-radio-row__title">Static</span></span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="cd-panel">
                <legend>{t('pagePalette', 'Page Palette')}</legend>
                <div className="policy-radios cd-segmented cd-segmented--2">
                  <label className="policy-label">
                    <input type="radio" checked={palette === 'dark'} onChange={() => actions.setPagePalette('dark')} /> <span>Dark</span>
                  </label>
                  <label className="policy-label">
                    <input type="radio" checked={palette === 'solarized-dark'} onChange={() => actions.setPagePalette('solarized-dark')} /> <span>Solarized</span>
                  </label>
                </div>
              </fieldset>

              <ThemeFiltersPanel filters={filters} onChange={actions.setFilters} />
              
              <TypographyPanel typography={typography} onChange={actions.setTypography} />

              <SiteToolsPanel 
                editScope={editScope} 
                siteCss={siteCss} 
                siteList={siteList} 
                onSiteCssChange={actions.setSiteCustomCss}
                onSiteCssBlur={actions.setSiteCustomCss}
                onSiteListModeChange={actions.updateSiteListMode}
                onSiteListEntriesChange={actions.updateSiteListEntries}
              />

            </div>
          )}

          {activeTab === 'support' && (
            <div className="cd-tab-panel">
              <section className="cd-support-panel">
                <p className="cd-support-panel__title">{t('supportTitle', 'Support the author')}</p>
                <p className="cd-support-panel__help">{t('supportHelp', 'If this extension helps you...')}</p>
                <a href="https://buymeacoffee.com/your-link" target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: '16px' }}>
                   <img src={qrCodeImgUrl} alt="QR Code" style={{ maxWidth: '150px', background: 'white', padding: '8px', borderRadius: '8px' }} />
                </a>
              </section>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
