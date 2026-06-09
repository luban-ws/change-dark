import React from 'react'
import { usePopupT } from '../usePopupT'
import type { ThemeFiltersStateV1 } from '@luban-ws/extension-settings'
import type { PopupTranslationKey } from '../i18n'
import { Card, Text, Flex, Box, Slider } from '@radix-ui/themes'

const FILTER_LABEL_KEYS: Record<
  keyof Pick<ThemeFiltersStateV1, 'brightness' | 'contrast' | 'sepia' | 'saturate'>,
  PopupTranslationKey
> = {
  brightness: 'lblBrightness',
  contrast: 'lblContrast',
  sepia: 'lblSepia',
  saturate: 'lblSaturate',
}

export interface ThemeFiltersPanelProps {
  filters: ThemeFiltersStateV1
  onChange: (f: ThemeFiltersStateV1) => void
}

export const ThemeFiltersPanel = ({ filters, onChange }: ThemeFiltersPanelProps) => {
  const { t } = usePopupT()
  return (
    <Card size="1">
      <Text as="div" size="2" weight="bold" mb="3">{t('filters')}</Text>
      <Flex direction="column" gap="3">
        {(['brightness', 'contrast', 'sepia', 'saturate'] as const).map(f => (
          <Box key={f}>
            <Flex justify="between" mb="1">
              <Text size="1" color="gray">{t(FILTER_LABEL_KEYS[f])}</Text>
              <Text size="1" weight="bold">{filters[f]}</Text>
            </Flex>
            <Slider 
              min={0} max={200} step={5} 
              value={[filters[f]]} 
              onValueChange={([val]) => onChange({ ...filters, [f]: val })}
            />
          </Box>
        ))}
      </Flex>
    </Card>
  )
}
