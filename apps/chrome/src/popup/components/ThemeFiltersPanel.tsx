import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ThemeFiltersStateV1 } from "@luban-ws/shared"

export interface ThemeFiltersPanelProps {
  filters: ThemeFiltersStateV1
  onChange: (f: ThemeFiltersStateV1) => void
}

export const ThemeFiltersPanel = ({ filters, onChange }: ThemeFiltersPanelProps) => {
  const { t } = useTranslation()
  return (
    <details className="cd-details">
      <summary className="cd-details__summary">{t('lblFilters', 'Theme Filters')}</summary>
      <div className="cd-details__body">
        {(['brightness', 'contrast', 'sepia', 'saturate'] as const).map(f => (
          <div key={f} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>{t(`lbl_${f}`, f.charAt(0).toUpperCase() + f.slice(1))}</span>
              <span>{filters[f]}</span>
            </div>
            <input 
              type="range" min="0" max="200" step="5" 
              value={filters[f]} 
              onChange={(e) => onChange({ ...filters, [f]: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>
    </details>
  )
}
