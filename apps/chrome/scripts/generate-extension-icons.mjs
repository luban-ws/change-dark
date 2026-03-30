/**
 * 自 `public/icons/icon.svg` 生成商店 / 清单所需 PNG（16–48 满幅；128 按 Chrome Web Store 规范：约 96×96 主图形 + 透明边距至 128×128）。
 * @see https://developer.chrome.com/docs/webstore/images#icon-size
 * 修改矢量稿后执行：`pnpm --filter @luban-ws/chrome run icons`
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/** 清单 16/32/48：工具栏小图标保持满幅可读性 */
const TOOLBAR_SIZES = [16, 32, 48]

/** 商店 / manifest 128：内容区域约 96px，四边各 16px 透明（合计 128×128） */
const STORE_OUTER = 128

const STORE_INNER = 96

const STORE_PADDING = (STORE_OUTER - STORE_INNER) / 2

const __dirname = dirname(fileURLToPath(import.meta.url))
const chromeRoot = join(__dirname, '..')
const svgPath = join(chromeRoot, 'public/icons/icon.svg')
const input = readFileSync(svgPath)

for (const size of TOOLBAR_SIZES) {
  const out = join(chromeRoot, 'public/icons', `icon-${size}.png`)
  await sharp(input).resize(size, size).png().toFile(out)
  console.warn('wrote', out)
}

const innerPng = await sharp(input).resize(STORE_INNER, STORE_INNER).png().toBuffer()
const out128 = join(chromeRoot, 'public/icons', `icon-${STORE_OUTER}.png`)
await sharp({
  create: {
    width: STORE_OUTER,
    height: STORE_OUTER,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: innerPng, left: STORE_PADDING, top: STORE_PADDING }])
  .png()
  .toFile(out128)

console.warn('wrote', out128)
