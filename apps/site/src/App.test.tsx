import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders product title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('嫦娥 Change Dark')
  })

  it('renders screenshot with descriptive alt', () => {
    const { container } = render(<App />)
    const section = container.querySelector('#screenshot')
    expect(section).not.toBeNull()
    const img = within(section as HTMLElement).getByRole('img')
    expect(img.getAttribute('alt')).toBe(
      '嫦娥 Change Dark 扩展选项界面：全局开关、仅当前站、主题模式等分段控件',
    )
  })
})
