import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THEME_FILTERS,
  buildThemeFilterValue,
  clampThemeFilters,
  parseThemeFiltersState,
} from '../theme-filters'

describe('buildThemeFilterValue', () => {
  it('默认值为中性链（快照）', () => {
    expect(buildThemeFilterValue(DEFAULT_THEME_FILTERS)).toMatchInlineSnapshot(
      `"brightness(100%) contrast(100%) sepia(0%) saturate(100%)"`,
    )
  })

  it('自定义参数快照', () => {
    expect(
      buildThemeFilterValue(
        clampThemeFilters({
          brightness: 120,
          contrast: 90,
          sepia: 10,
          saturate: 80,
        }),
      ),
    ).toMatchInlineSnapshot(`"brightness(120%) contrast(90%) sepia(10%) saturate(80%)"`)
  })
})

describe('parseThemeFiltersState', () => {
  it('非法回退默认', () => {
    expect(parseThemeFiltersState(null)).toEqual(DEFAULT_THEME_FILTERS)
    expect(parseThemeFiltersState({})).toEqual(DEFAULT_THEME_FILTERS)
  })

  it('钳位越界值', () => {
    expect(
      parseThemeFiltersState({
        brightness: 500,
        contrast: 0,
        sepia: -5,
        saturate: 999,
      }),
    ).toEqual({
      brightness: 200,
      contrast: 10,
      sepia: 0,
      saturate: 200,
    })
  })
})
