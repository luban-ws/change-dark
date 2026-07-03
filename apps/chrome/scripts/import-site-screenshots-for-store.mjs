#!/usr/bin/env node
/**
 * Letterbox apps/site/public screenshots → docs/publish/ (Chrome Web Store).
 *
 * Store rules: 1–5 images, 1280×800 or 640×400, JPEG or 24-bit PNG (no alpha).
 *
 * Sources (in upload order):
 *   en.png, en-2.png, zh.png, zh-2.png
 *
 * Run: pnpm run screenshots:site-to-store
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const SITE_PUBLIC = path.join(REPO_ROOT, 'apps/site/public')
const OUT_DIR = path.join(REPO_ROOT, 'docs/publish')

const STORE_W = 1280
const STORE_H = 800
/** Solarized base03 — letterbox + alpha flatten background */
const LETTERBOX_RGB = { r: 0, g: 43, b: 54 }

/** Max 5 store screenshots; order = recommended Dashboard upload sequence */
const STORE_SHOTS = [
  { src: 'en.png', out: 'screenshot-en-1280x800.png' },
  { src: 'en-2.png', out: 'screenshot-en-2-1280x800.png' },
  { src: 'zh.png', out: 'screenshot-zh-1280x800.png' },
  { src: 'zh-2.png', out: 'screenshot-zh-2-1280x800.png' },
]

async function letterboxToStore(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(STORE_W, STORE_H, { fit: 'contain', background: LETTERBOX_RGB })
    .flatten({ background: LETTERBOX_RGB })
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(outputPath)
}

async function writePromoFromStore(storePngPath, promoPath) {
  await sharp(storePngPath)
    .resize(440, 280, { fit: 'cover', position: 'centre' })
    .flatten({ background: LETTERBOX_RGB })
    .png({ compressionLevel: 9, palette: false, force: true })
    .toFile(promoPath)
}

async function main() {
  await fs.promises.mkdir(OUT_DIR, { recursive: true })

  for (const { src, out } of STORE_SHOTS) {
    const input = path.join(SITE_PUBLIC, src)
    if (!fs.existsSync(input)) {
      console.error(`[site-to-store] Missing ${input}`)
      process.exit(1)
    }
    const output = path.join(OUT_DIR, out)
    await letterboxToStore(input, output)
    console.log(`[site-to-store] ${src} → ${out}`)
  }

  const enStore = path.join(OUT_DIR, STORE_SHOTS[0].out)
  const promo = path.join(OUT_DIR, 'promo-tile-440x280.png')
  await writePromoFromStore(enStore, promo)
  console.log(`[site-to-store] promo → promo-tile-440x280.png`)
  console.log(`[site-to-store] ${STORE_SHOTS.length} screenshots (1280×800 RGB PNG, no alpha)`)
}

main().catch((err) => {
  console.error('[site-to-store] Failed:', err)
  process.exit(1)
})
