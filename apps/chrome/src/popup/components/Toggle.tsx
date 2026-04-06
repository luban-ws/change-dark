import React from 'react'

export interface ToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: () => void
  className?: string
}

export const Toggle = ({ checked, disabled, onChange, className = '' }: ToggleProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`cd-site-switch ${checked ? 'cd-site-switch--on' : ''} ${className}`}
      onClick={onChange}
    >
      <span className="cd-site-switch__track">
        <span className="cd-site-switch__thumb" />
      </span>
    </button>
  )
}
