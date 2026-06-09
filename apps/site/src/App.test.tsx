import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders product title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('嫦娥 (Selena)')
  })

  it('renders screenshot with descriptive alt', () => {
    const { container } = render(<App />)
    const section = container.querySelector('#screenshot')
    expect(section).not.toBeNull()
    const img = within(section as HTMLElement).getByRole('img')
    expect(img.getAttribute('alt')).toBe('功能界面一览')
  })
})
