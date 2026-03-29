/**
 * 将 `getComputedStyle(...).backgroundColor` 等常见 `rgb`/`rgba` 形式解析为 0..255 三元组。
 * 百分比、`hsl`、命名色等暂不实现（返回 null，由采样侧跳过）。
 */
export function parseCssRgbToTriplet(input: string): [number, number, number] | null {
  const s = input.trim()
  if (s === '' || s === 'transparent') return null
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s)
  if (!m) return null
  const r = clamp255(Number(m[1]))
  const g = clamp255(Number(m[2]))
  const b = clamp255(Number(m[3]))
  if ([r, g, b].some((x) => Number.isNaN(x))) return null
  return [r, g, b]
}

function clamp255(n: number): number {
  if (Number.isNaN(n)) return NaN
  return Math.round(Math.min(255, Math.max(0, n)))
}
