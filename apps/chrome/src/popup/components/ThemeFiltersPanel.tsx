import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ThemeFiltersStateV1 } from "@luban-ws/dark-shared"
import { Card, Text, Flex, Box, Slider } from '@radix-ui/themes'

export interface ThemeFiltersPanelProps {
  filters: ThemeFiltersStateV1
  onChange: (f: ThemeFiltersStateV1) => void
}

export const ThemeFiltersPanel = ({ filters, onChange }: ThemeFiltersPanelProps) => {
  const { t } = useTranslation()
  return (
    <Card size="1">
      <Text as="div" size="2" weight="bold" mb="3">{t('lblFilters', 'Theme Filters')}</Text>
      <Flex direction="column" gap="3">
        {(['brightness', 'contrast', 'sepia', 'saturate'] as const).map(f => (
          <Box key={f}>
            <Flex justify="between" mb="1">
              <Text size="1" color="gray">{t(`lbl_${f}`, f.charAt(0).toUpperCase() + f.slice(1))}</Text>
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
