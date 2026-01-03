import { memo, useMemo } from 'react'
import './Button.css'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  icon?: string
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large'
  ariaLabel?: string
}

function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  icon,
  fullWidth = false,
  size = 'medium',
  ariaLabel
}: ButtonProps) {
  // Memoize classNames computation to prevent unnecessary recalculations
  const classNames = useMemo(() => [
    'button',
    `button--${variant}`,
    `button--${size}`,
    disabled ? 'button--disabled' : '',
    fullWidth ? 'button--full-width' : '',
    icon ? 'button--with-icon' : ''
  ].filter(Boolean).join(' '), [variant, size, disabled, fullWidth, icon])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}

export default memo(Button)
