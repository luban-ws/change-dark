import React from 'react'
import { useTranslation } from 'react-i18next'
import type { TypographySettingsV1 } from "@luban-ws/dark-shared"
import { Card, Text, Flex, Switch, Select, TextField, Slider } from '@radix-ui/themes'

export interface TypographyPanelProps {
  typography: TypographySettingsV1
  onChange: (t: TypographySettingsV1) => void
}

export const TypographyPanel = ({ typography, onChange }: TypographyPanelProps) => {
  const { t } = useTranslation()
  return (
    <Card size="1">
      <Text as="div" size="2" weight="bold" mb="3">{t('lblTypography', 'Typography & Stroke')}</Text>
      <Flex direction="column" gap="3">
        
        <Flex align="center" gap="2">
          <Switch checked={typography.fontEnabled} onCheckedChange={(val) => onChange({ ...typography, fontEnabled: val })} />
          <Text size="2">{t('lblEnableFont', 'Override Font')}</Text>
        </Flex>

        <Select.Root 
          value={typography.fontPreset || 'system'} 
          onValueChange={(val) => onChange({ ...typography, fontPreset: val as any })}
        >
          <Select.Trigger placeholder="Select font…" />
          <Select.Content>
            <Select.Item value="system">System UI</Select.Item>
            <Select.Item value="sans">Sans Serif</Select.Item>
            <Select.Item value="serif">Serif</Select.Item>
            <Select.Item value="mono">Monospace</Select.Item>
            <Select.Item value="custom">Custom…</Select.Item>
          </Select.Content>
        </Select.Root>



        {typography.fontPreset === 'custom' && (
          <TextField.Root 
            placeholder="Font family..." 
            value={typography.customFontFamily} 
            onChange={(e) => onChange({ ...typography, customFontFamily: e.target.value })}
          />
        )}

        <Flex align="center" gap="2" mt="2">
          <Switch checked={typography.textStrokeEnabled} onCheckedChange={(val) => onChange({ ...typography, textStrokeEnabled: val })} />
          <Text size="2">{t('lblEnableStroke', 'Text Stroke (0.01px to 1px)')}</Text>
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
