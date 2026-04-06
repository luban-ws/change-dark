import React from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Text, Flex, TextArea, SegmentedControl } from '@radix-ui/themes'

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
    <Flex direction="column" gap="4">
      {editScope === 'site' && (
        <Card size="1">
          <Text as="div" size="2" weight="bold" mb="2">{t('lblCustomCss', 'Per-Site Custom CSS')}</Text>
          <TextArea 
            size="2"
            style={{ fontFamily: 'monospace', height: '80px' }} 
            value={siteCss}
            onChange={(e) => onSiteCssChange(e.target.value)}
            onBlur={(e) => onSiteCssBlur(e.target.value)}
          />
        </Card>
      )}

      <Card size="1">
        <Text as="div" size="2" weight="bold" mb="2">{t('lblSiteList', 'Site List Settings')}</Text>
        <SegmentedControl.Root 
          value={siteList.mode} 
          onValueChange={(val) => onSiteListModeChange(val as any)} 
          size="1" mb="3"
        >
          <SegmentedControl.Item value="not-invert-listed">Blacklist</SegmentedControl.Item>
          <SegmentedControl.Item value="invert-listed-only">Whitelist</SegmentedControl.Item>
        </SegmentedControl.Root>
        <TextArea 
          size="2"
          style={{ fontFamily: 'monospace', height: '80px' }} 
          placeholder="example.com&#10;github.com"
          defaultValue={siteList.entries.join('\n')}
          onBlur={(e) => {
             const lines = e.target.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
             onSiteListEntriesChange([...new Set(lines)].sort().slice(0, 100))
          }}
        />
      </Card>
    </Flex>
  )
}
