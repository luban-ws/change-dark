import React from 'react'
import { usePopupT } from '../usePopupT'
import {
  FONT_PRESET_LABEL_KEYS,
  type FontPresetValue,
} from '../popup-translation-keys'
import type { TypographySettingsV1 } from '@change-dark/extension-settings'
import { Card, Text, Flex, Switch, Select, TextField, Slider } from '@radix-ui/themes'

export interface TypographyPanelProps {
  typography: TypographySettingsV1
  onChange: (t: TypographySettingsV1) => void
}

function resolveFontPreset(value: string | undefined): FontPresetValue {
  if (value === 'sans' || value === 'serif' || value === 'mono' || value === 'custom') {
    return value
  }
  return 'system'
}

export const TypographyPanel = ({ typography, onChange }: TypographyPanelProps) => {
  const { t, lng } = usePopupT()
  const fontPreset = resolveFontPreset(typography.fontPreset)
  const fontPresetLabel = t(FONT_PRESET_LABEL_KEYS[fontPreset])

  return (
    <Card size="1">
      <Text as="div" size="2" weight="bold" mb="3">{t('typography')}</Text>
      <Flex direction="column" gap="3">
        
        <Flex align="center" gap="2">
          <Switch checked={typography.fontEnabled} onCheckedChange={(val) => onChange({ ...typography, fontEnabled: val })} />
          <Text size="2">{t('lblEnableFont')}</Text>
        </Flex>

        <Select.Root
          key={`font-preset-${lng}`}
          value={fontPreset}
          onValueChange={(val) => onChange({ ...typography, fontPreset: val as FontPresetValue })}
        >
          <Select.Trigger placeholder={t('lblSelectFont')}>
            {fontPresetLabel}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="system">{t('lblFontSystem')}</Select.Item>
            <Select.Item value="sans">{t('lblFontSans')}</Select.Item>
            <Select.Item value="serif">{t('lblFontSerif')}</Select.Item>
            <Select.Item value="mono">{t('lblFontMono')}</Select.Item>
            <Select.Item value="custom">{t('lblFontCustom')}</Select.Item>
          </Select.Content>
        </Select.Root>

        {fontPreset === 'custom' && (
          <TextField.Root 
            placeholder={t('lblFontFamilyPlaceholder')} 
            value={typography.customFontFamily} 
            onChange={(e) => onChange({ ...typography, customFontFamily: e.target.value })}
          />
        )}

        <Flex align="center" gap="2" mt="2">
          <Switch checked={typography.textStrokeEnabled} onCheckedChange={(val) => onChange({ ...typography, textStrokeEnabled: val })} />
          <Text size="2">{t('lblEnableStroke')}</Text>
        </Flex>

        <Flex align="center" gap="3">
          <Slider 
            style={{ flex: 1 }}
            min={0} max={100} step={1} 
            disabled={!typography.textStrokeEnabled}
            value={[Math.round(typography.textStrokeWidthPx * 100)]} 
            onValueChange={([val]) => onChange({ ...typography, textStrokeWidthPx: val / 100 })}
          />
          <Text size="1" style={{ minWidth: '30px' }}>{typography.textStrokeWidthPx.toFixed(2)}</Text>
        </Flex>

      </Flex>
    </Card>
  )
}
