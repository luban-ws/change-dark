import React from 'react'
import { useTranslation } from 'react-i18next'
import type { TypographySettingsV1 } from "@luban-ws/shared"

export interface TypographyPanelProps {
  typography: TypographySettingsV1
  onChange: (t: TypographySettingsV1) => void
}

export const TypographyPanel = ({ typography, onChange }: TypographyPanelProps) => {
  const { t } = useTranslation()
  return (
    <details className="cd-details">
      <summary className="cd-details__summary">{t('lblTypography', 'Typography & Stroke')}</summary>
      <div className="cd-details__body">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="checkbox" checked={typography.fontEnabled} onChange={(e) => onChange({ ...typography, fontEnabled: e.target.checked })} />
          <span>{t('lblEnableFont', 'Override Font')}</span>
        </div>
        <select 
          style={{ width: '100%', marginBottom: typography.fontPreset === 'custom' ? '8px' : '16px' }}
          value={typography.fontPreset} 
          onChange={(e) => onChange({ ...typography, fontPreset: e.target.value as any })}
        >
          <option value="system-ui">System UI</option>
          <option value="sans-serif">Sans Serif</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
          <option value="custom">Custom...</option>
        </select>
        {typography.fontPreset === 'custom' && (
          <input 
            type="text" 
            placeholder="Font family..." 
            value={typography.customFontFamily} 
            onChange={(e) => onChange({ ...typography, customFontFamily: e.target.value })}
            style={{ width: '100%', marginBottom: '16px' }}
          />
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="checkbox" checked={typography.textStrokeEnabled} onChange={(e) => onChange({ ...typography, textStrokeEnabled: e.target.checked })} />
          <span>{t('lblEnableStroke', 'Text Stroke (0.01px to 1px)')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="range" min="0" max="100" step="1" 
            disabled={!typography.textStrokeEnabled}
            value={Math.round(typography.textStrokeWidthPx * 100)} 
            onChange={(e) => onChange({ ...typography, textStrokeWidthPx: parseInt(e.target.value) / 100 })}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: '12px', minWidth: '30px' }}>{typography.textStrokeWidthPx.toFixed(2)}</span>
        </div>
      </div>
    </details>
  )
}
