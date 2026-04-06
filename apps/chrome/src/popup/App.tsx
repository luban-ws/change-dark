import React from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { STORAGE_KEY_LANG } from './i18n'

import { usePopupState } from './hooks/usePopupState'
import {
  POLICY_AUTO, POLICY_OFF, POLICY_ON, type GlobalPolicy,
  THEME_MODE_DYNAMIC, THEME_MODE_STATIC, THEME_MODE_FILTER_CSS, THEME_MODE_FILTER_PLUS,
} from "@luban-ws/dark-shared"
import { shouldExposeFilterPlusMode } from "@luban-ws/dark-shared"
import { ThemeFiltersPanel } from './components/ThemeFiltersPanel'
import { TypographyPanel } from './components/TypographyPanel'
import { SiteToolsPanel } from './components/SiteToolsPanel'
import qrCodeImgUrl from './qr-code.png'

import { Flex, Box, Text, Heading, Tabs, Card, Switch, ScrollArea, SegmentedControl, Button, Select, Slider } from '@radix-ui/themes'
import { Settings, Heart, Moon } from 'lucide-react'

export default function App() {
  const { t, i18n } = useTranslation()
  
  const { 
    origin, hostnameTitle, editScope, hasSiteOverride, isSiteForcedDark, 
    policy, themeMode, filters, palette, typography, siteCss, siteList, autoDarkThreshold, actions 
  } = usePopupState()

  const isFirefoxUiGateActive = !shouldExposeFilterPlusMode()

  return (
    <Flex className={`theme-mode-${palette}`} direction="column" style={{ height: '600px', width: '380px', backgroundColor: 'var(--color-page-background)' }}>
      {/* Header - Fixed */}
      <Box p="3" style={{ borderBottom: '1px solid var(--gray-a4)', backgroundColor: 'var(--color-panel-solid)' }}>
        <Flex justify="between" align="start">
          <Flex gap="2" align="center">
            <Moon size={20} color="var(--accent-a10)" />
            <Box>
              <Heading size="3">{t('extName', 'Selena')}</Heading>
              <Text size="1" color="gray">{t('extSubtitle', 'Force dark rules')}</Text>
            </Box>
          </Flex>
          <Box>
            <Select.Root 
              value={i18n.language === 'zh_CN' ? 'zh_CN' : 'en'} 
              onValueChange={(val) => {
                void i18n.changeLanguage(val)
                void chrome.storage.local.set({ [STORAGE_KEY_LANG]: val })
              }}

              size="1"
            >
              <Select.Trigger variant="ghost" />
              <Select.Content>
                <Select.Item value="zh_CN">中文</Select.Item>
                <Select.Item value="en">EN</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>
        </Flex>
      </Box>

      {/* Tabs Layout */}
      <Tabs.Root defaultValue="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Tabs.List size="2">
          <Tabs.Trigger value="main">
            <Flex gap="2" align="center">
              <Settings size={14} />
              {t('tabSettings', 'Settings')}
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="support">
            <Flex gap="2" align="center">
              <Heart size={14} />
              {t('tabSupport', 'Support')}
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Box style={{ flex: 1, minHeight: 0 }}>
          <Tabs.Content value="main" style={{ height: '100%', outline: 'none' }}>
            <ScrollArea type="auto" scrollbars="vertical" style={{ height: '100%' }}>
              <Flex direction="column" gap="4" p="3">
                
                {/* Current Site Card */}
                <Card size="1">
                  <Flex justify="between" align="center" mb="2">
                    <Text size="2" weight="bold">{t('lblCurrentSite', 'Current Site')}</Text>
                    <Text size="1" color="gray" truncate style={{ maxWidth: '140px' }} title={origin || ''}>{hostnameTitle || '—'}</Text>
                  </Flex>
                  <Flex justify="between" align="start" gap="3">
                    <Switch 
                      disabled={!origin}
                      checked={isSiteForcedDark}
                      onCheckedChange={() => actions.toggleCurrentSiteForcedDark()}
                    />
                    <Text size="1" color="gray" style={{ flex: 1 }}>
                      {!origin ? t('lblNoOrigin', 'Open a valid web page to enable rules.') : 
                        isSiteForcedDark ? t('lblSiteForced', 'This site is forced dark by site list rules.') : 
                        t('lblSiteNotForced', 'This site follows global dark mode rules.')
                      }
                    </Text>
                  </Flex>
                </Card>

                {/* Global Switch Card */}
                <Card size="1">
                  <Flex justify="between" align="center" mb="2">
                    <Text size="2" weight="bold">{t('globalSwitch', 'Global Switch')}</Text>
                    {policy === POLICY_AUTO && (
                      <Text size="1" color="gray">
                        {t('lblThreshold', 'Threshold')}: {autoDarkThreshold}
                      </Text>
                    )}
                  </Flex>
                  <SegmentedControl.Root value={policy} onValueChange={(val) => actions.setPolicy(val as GlobalPolicy)} size="2" mb={policy === POLICY_AUTO ? "3" : "0"}>
                    <SegmentedControl.Item value={POLICY_AUTO}>{t('lblAuto', 'Auto')}</SegmentedControl.Item>
                    <SegmentedControl.Item value={POLICY_ON}>{t('lblOn', 'On')}</SegmentedControl.Item>
                    <SegmentedControl.Item value={POLICY_OFF}>{t('lblOff', 'Off')}</SegmentedControl.Item>
                  </SegmentedControl.Root>

                  {policy === POLICY_AUTO && (
                    <Flex direction="column" gap="1">
                      <Slider 
                        size="1"
                        min={0} max={255} step={5}
                        value={[autoDarkThreshold]}
                        onValueChange={([val]) => actions.setAutoDarkThreshold(val)}
                      />
                      <Flex justify="between">
                        <Text size="1" color="gray">{t('lblStrict', 'Strict')}</Text>
                        <Text size="1" color="gray">{t('lblRelaxed', 'Relaxed')}</Text>
                      </Flex>
                    </Flex>
                  )}
                </Card>

                {/* Scope Mode */}
                <Flex align="center" justify="between">
                  <SegmentedControl.Root value={editScope} onValueChange={(val) => actions.setEditScope(val as any)} size="1">
                    <SegmentedControl.Item value="global">{t('lblScopeGlobal', 'Global Edit')}</SegmentedControl.Item>
                    <SegmentedControl.Item value="site" style={{ opacity: !origin ? 0.5 : 1, pointerEvents: !origin ? 'none' : 'auto' }}>
                      {t('lblScopeSite', 'Only Current Site')}
                    </SegmentedControl.Item>
                  </SegmentedControl.Root>
                  {hasSiteOverride && (
                    <Button
                      size="1"
                      color="red"
                      variant="soft"
                      onClick={() => actions.clearSiteOverride()}
                      style={{ fontSize: '11px', padding: '2px 7px', height: '22px', lineHeight: 1 }}
                    >
                      ✕
                    </Button>
                  )}

                </Flex>

                {/* Theme Mode Card */}
                <Card size="1">
                  <Text as="div" size="2" weight="bold" mb="2">{t('themeMode', 'Theme Mode')}</Text>
                  <Flex direction="column" gap="2">
                    {[
                      { value: THEME_MODE_FILTER_CSS, label: 'Filter' },
                      { value: THEME_MODE_FILTER_PLUS, label: 'Filter+', disabled: isFirefoxUiGateActive },
                      { value: THEME_MODE_DYNAMIC, label: 'Dynamic (Expr)' },
                      { value: THEME_MODE_STATIC, label: 'Static' },
                    ].map(opt => (
                      <Box key={opt.value} style={{ opacity: opt.disabled ? 0.5 : 1 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: opt.disabled ? 'not-allowed' : 'pointer' }}>
                          <input 
                            type="radio" 
                            name="themeMode" 
                            disabled={opt.disabled}
                            checked={themeMode === opt.value} 
                            onChange={() => actions.setThemeMode(opt.value)} 
                            style={{ margin: 0 }}
                          />
                          <Text size="2">{opt.label}</Text>
                          {opt.disabled && <Text size="1" color="red" style={{ marginLeft: 'auto' }}>{t('lblFxGate', 'Disabled on Firefox')}</Text>}
                        </label>
                      </Box>
                    ))}
                  </Flex>
                </Card>

                {/* Page Palette Card */}
                <Card size="1">
                  <Text as="div" size="2" weight="bold" mb="2">{t('pagePalette', 'Page Palette')}</Text>
                  <SegmentedControl.Root value={palette} onValueChange={(val) => actions.setPagePalette(val as any)} size="2">
                    <SegmentedControl.Item value="dark">Dark</SegmentedControl.Item>
                    <SegmentedControl.Item value="solarized-dark">Solarized</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </Card>

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
              </Flex>
            </ScrollArea>
          </Tabs.Content>

          <Tabs.Content value="support" style={{ height: '100%', outline: 'none' }}>
            <ScrollArea type="auto" scrollbars="vertical" style={{ height: '100%' }}>
              <Flex direction="column" align="center" gap="4" p="4" mt="4">
                <Text size="3" weight="bold">{t('supportTitle', 'Support the author')}</Text>
                <Text size="2" color="gray" align="center" style={{ maxWidth: '280px' }}>
                  {t('supportHelp', 'If this extension helps you...')}
                </Text>
                <a href="https://buymeacoffee.com/your-link" target="_blank" rel="noreferrer" style={{ marginTop: '16px' }}>
                  <img src={qrCodeImgUrl} alt="QR Code" style={{ maxWidth: '150px', background: 'white', padding: '8px', borderRadius: '8px' }} />
                </a>
              </Flex>
            </ScrollArea>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Flex>
  )
}
