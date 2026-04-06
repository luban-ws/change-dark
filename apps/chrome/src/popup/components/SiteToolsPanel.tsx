import React from 'react'
import { useTranslation } from 'react-i18next'

export interface SiteToolsPanelProps {
  editScope: 'global' | 'site'
  siteCss: string
  siteList: { mode: string; entries: string[] }
  onSiteCssChange: (css: string) => void
  onSiteCssBlur: (css: string) => void
  onSiteListModeChange: (mode: 'not-invert-listed' | 'invert-listed-only') => void
  onSiteListEntriesChange: (entries: string[]) => void
}

export const SiteToolsPanel = ({ 
  editScope, 
  siteCss, 
  siteList, 
  onSiteCssChange, 
  onSiteCssBlur,
  onSiteListModeChange, 
  onSiteListEntriesChange 
}: SiteToolsPanelProps) => {
  const { t } = useTranslation()

  return (
    <>
      {editScope === 'site' && (
        <details className="cd-details">
          <summary className="cd-details__summary">{t('lblCustomCss', 'Per-Site Custom CSS')}</summary>
          <div className="cd-details__body">
            <textarea 
              style={{ width: '100%', height: '80px', fontFamily: 'monospace' }} 
              value={siteCss}
              onChange={(e) => onSiteCssChange(e.target.value)}
              onBlur={(e) => onSiteCssBlur(e.target.value)}
            />
          </div>
        </details>
      )}

      <details className="cd-details">
        <summary className="cd-details__summary">{t('lblSiteList', 'Site List Settings')}</summary>
        <div className="cd-details__body">
          <div className="cd-segmented cd-segmented--2" style={{ marginBottom: '8px' }}>
            <label>
              <input type="radio" checked={siteList.mode === 'not-invert-listed'} onChange={() => onSiteListModeChange('not-invert-listed')} /> 
              <span>Blacklist</span>
            </label>
            <label>
              <input type="radio" checked={siteList.mode === 'invert-listed-only'} onChange={() => onSiteListModeChange('invert-listed-only')} /> 
              <span>Whitelist</span>
            </label>
          </div>
          <textarea 
            style={{ width: '100%', height: '80px', fontFamily: 'monospace' }} 
            placeholder="example.com&#10;github.com"
            defaultValue={siteList.entries.join('\n')}
            onBlur={(e) => {
               const lines = e.target.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
               onSiteListEntriesChange([...new Set(lines)].sort().slice(0, 100))
            }}
          />
        </div>
      </details>
    </>
  )
}
