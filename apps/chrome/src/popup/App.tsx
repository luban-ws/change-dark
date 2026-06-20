import React from 'react'
import { usePopupT } from './usePopupT'
import { STORAGE_KEY_LANG, type PopupLanguage } from './i18n'
import { usePopupState } from './hooks/usePopupState'
import {
  POLICY_AUTO, POLICY_OFF, POLICY_ON, type GlobalPolicy,
} from '@change-dark/extension-settings'
import { ThemeFiltersPanel } from './components/ThemeFiltersPanel'
import { TypographyPanel } from './components/TypographyPanel'
import { SiteToolsPanel } from './components/SiteToolsPanel'
import qrCodeImgUrl from './qr-code.png'

import { Flex, Box, Text, Heading, Tabs, Card, Switch, ScrollArea, SegmentedControl, Button, Select, Slider } from '@radix-ui/themes'
import { Settings, Heart, Moon } from 'lucide-react'

export default function App() {
  const { t, i18n, lng } = usePopupT()
  
  const { 
    origin, hostnameTitle, editScope, hasSiteOverride, isSiteForcedDark, 
    policy, filters, palette, typography, siteCss, siteList, autoDarkThreshold, actions 
  } = usePopupState()

  return (
      <Flex
          key={`popup-root-${lng}`}
          className={`theme-mode-${palette}`}
          direction="column"
          style={{
              height: "600px",
              width: "380px",
              backgroundColor: "var(--color-page-background)",
          }}
      >
          <Box
              p="3"
              style={{
                  borderBottom: "1px solid var(--gray-a4)",
                  backgroundColor: "var(--color-panel-solid)",
              }}
          >
              <Flex justify="between" align="start">
                  <Flex gap="2" align="center">
                      <Moon size={20} color="var(--accent-a10)" />
                      <Box>
                          <Heading size="3">{t('extName')}</Heading>
                          <Text size="1" color="gray">
                              {t('extSubtitle')}
                          </Text>
                      </Box>
                  </Flex>
                  <Box>
                      <Select.Root
                          value={lng}
                          onValueChange={(val) => {
                              const lng = val as PopupLanguage
                              void i18n.changeLanguage(lng)
                              void chrome.storage.local.set({
                                  [STORAGE_KEY_LANG]: lng,
                              })
                          }}
                          size="1"
                      >
                          <Select.Trigger variant="ghost">
                              {lng === 'zh_CN' ? t('lblLangZh') : t('lblLangEn')}
                          </Select.Trigger>
                          <Select.Content>
                              <Select.Item value="zh_CN">{t('lblLangZh')}</Select.Item>
                              <Select.Item value="en">{t('lblLangEn')}</Select.Item>
                          </Select.Content>
                      </Select.Root>
                  </Box>
              </Flex>
          </Box>

          <Tabs.Root
              defaultValue="main"
              style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
              }}
          >
              <Tabs.List size="2">
                  <Tabs.Trigger value="main">
                      <Flex gap="2" align="center">
                          <Settings size={14} />
                          {t('tabSettings')}
                      </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="support">
                      <Flex gap="2" align="center">
                          <Heart size={14} />
                          {t('tabSupport')}
                      </Flex>
                  </Tabs.Trigger>
              </Tabs.List>

              <Box style={{ flex: 1, minHeight: 0 }}>
                  <Tabs.Content
                      value="main"
                      style={{ height: "100%", outline: "none" }}
                  >
                      <ScrollArea
                          type="auto"
                          scrollbars="vertical"
                          style={{ height: "100%" }}
                      >
                          <Flex direction="column" gap="4" p="3">
                              <Card size="1">
                                  <Flex justify="between" align="center" mb="2">
                                      <Text size="2" weight="bold">
                                          {t('lblCurrentSite')}
                                      </Text>
                                      <Text
                                          size="1"
                                          color="gray"
                                          truncate
                                          style={{ maxWidth: "140px" }}
                                          title={origin || ""}
                                      >
                                          {hostnameTitle || t('lblNoHostname')}
                                      </Text>
                                  </Flex>
                                  <Flex justify="between" align="start" gap="3">
                                      <Switch
                                          disabled={!origin}
                                          checked={isSiteForcedDark}
                                          onCheckedChange={() =>
                                              actions.toggleCurrentSiteForcedDark()
                                          }
                                      />
                                      <Text
                                          size="1"
                                          color="gray"
                                          style={{ flex: 1 }}
                                      >
                                          {!origin
                                              ? t('lblNoOrigin')
                                              : isSiteForcedDark
                                                ? t('lblSiteForced')
                                                : t('lblSiteNotForced')}
                                      </Text>
                                  </Flex>
                              </Card>

                              <Card size="1">
                                  <Flex justify="between" align="center" mb="2">
                                      <Text size="2" weight="bold">
                                          {t('globalSwitch')}
                                      </Text>
                                      {policy === POLICY_AUTO && (
                                          <Text size="1" color="gray">
                                              {t('lblThreshold')}:{" "}
                                              {autoDarkThreshold}
                                          </Text>
                                      )}
                                  </Flex>
                                  <SegmentedControl.Root
                                      value={policy}
                                      onValueChange={(val) =>
                                          actions.setPolicy(val as GlobalPolicy)
                                      }
                                      size="2"
                                      mb={policy === POLICY_AUTO ? "3" : "0"}
                                  >
                                      <SegmentedControl.Item
                                          value={POLICY_AUTO}
                                      >
                                          {t('lblAuto')}
                                      </SegmentedControl.Item>
                                      <SegmentedControl.Item value={POLICY_ON}>
                                          {t('lblOn')}
                                      </SegmentedControl.Item>
                                      <SegmentedControl.Item value={POLICY_OFF}>
                                          {t('lblOff')}
                                      </SegmentedControl.Item>
                                  </SegmentedControl.Root>

                                  {policy === POLICY_AUTO && (
                                      <Flex direction="column" gap="1">
                                          <Slider
                                              size="1"
                                              min={0}
                                              max={255}
                                              step={5}
                                              value={[autoDarkThreshold]}
                                              onValueChange={([val]) =>
                                                  actions.setAutoDarkThreshold(
                                                      val,
                                                  )
                                              }
                                          />
                                          <Flex justify="between">
                                              <Text size="1" color="gray">
                                                  {t('lblStrict')}
                                              </Text>
                                              <Text size="1" color="gray">
                                                  {t('lblRelaxed')}
                                              </Text>
                                          </Flex>
                                      </Flex>
                                  )}
                              </Card>

                              <Flex align="center" justify="between">
                                  <SegmentedControl.Root
                                      value={editScope}
                                      onValueChange={(val) =>
                                          actions.setEditScope(val as any)
                                      }
                                      size="1"
                                  >
                                      <SegmentedControl.Item value="global">
                                          {t('lblScopeGlobal')}
                                      </SegmentedControl.Item>
                                      <SegmentedControl.Item
                                          value="site"
                                          style={{
                                              opacity: !origin ? 0.5 : 1,
                                              pointerEvents: !origin
                                                  ? "none"
                                                  : "auto",
                                          }}
                                      >
                                          {t('lblScopeSite')}
                                      </SegmentedControl.Item>
                                  </SegmentedControl.Root>
                                  {hasSiteOverride && (
                                      <Button
                                          size="1"
                                          color="red"
                                          variant="soft"
                                          aria-label={t('lblClearSiteOverride')}
                                          onClick={() =>
                                              actions.clearSiteOverride()
                                          }
                                          style={{
                                              fontSize: "11px",
                                              padding: "2px 7px",
                                              height: "22px",
                                              lineHeight: 1,
                                          }}
                                      >
                                          ✕
                                      </Button>
                                  )}
                              </Flex>

                              <Card size="1">
                                  <Text as="div" size="2" weight="bold" mb="2">
                                      {t('pagePalette')}
                                  </Text>
                                  <SegmentedControl.Root
                                      value={palette}
                                      onValueChange={(val) =>
                                          actions.setPagePalette(val as any)
                                      }
                                      size="2"
                                  >
                                      <SegmentedControl.Item value="dark">
                                          {t('lblPaletteDark')}
                                      </SegmentedControl.Item>
                                      <SegmentedControl.Item value="solarized-dark">
                                          {t('lblPaletteSolarized')}
                                      </SegmentedControl.Item>
                                  </SegmentedControl.Root>
                              </Card>

                              <ThemeFiltersPanel
                                  filters={filters}
                                  onChange={actions.setFilters}
                              />
                              <TypographyPanel
                                  typography={typography}
                                  onChange={actions.setTypography}
                              />
                              <SiteToolsPanel
                                  editScope={editScope}
                                  siteCss={siteCss}
                                  siteList={siteList}
                                  onSiteCssChange={actions.setSiteCustomCss}
                                  onSiteCssBlur={actions.setSiteCustomCss}
                                  onSiteListModeChange={
                                      actions.updateSiteListMode
                                  }
                                  onSiteListEntriesChange={
                                      actions.updateSiteListEntries
                                  }
                              />
                          </Flex>
                      </ScrollArea>
                  </Tabs.Content>

                  <Tabs.Content
                      value="support"
                      style={{ height: "100%", outline: "none" }}
                  >
                      <ScrollArea
                          type="auto"
                          scrollbars="vertical"
                          style={{ height: "100%" }}
                      >
                          <Flex
                              direction="column"
                              align="center"
                              gap="4"
                              p="4"
                              mt="4"
                          >
                              <Text size="3" weight="bold">
                                  {t('supportTitle')}
                              </Text>
                              <Text
                                  size="2"
                                  color="gray"
                                  align="center"
                                  style={{ maxWidth: "280px" }}
                              >
                                  {t('supportHelp')}
                              </Text>
                              <a
                                  href="https://buymeacoffee.com/ppvb0uo"
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ marginTop: "16px" }}
                              >
                                  <img
                                      src={qrCodeImgUrl}
                                      alt={t('altQrCode')}
                                      style={{
                                          maxWidth: "150px",
                                          background: "white",
                                          padding: "8px",
                                          borderRadius: "8px",
                                      }}
                                  />
                              </a>
                          </Flex>
                      </ScrollArea>
                  </Tabs.Content>
              </Box>
          </Tabs.Root>
      </Flex>
  );
}
