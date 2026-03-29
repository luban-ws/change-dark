import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders product title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('为网页强制暗色')
  })
})
