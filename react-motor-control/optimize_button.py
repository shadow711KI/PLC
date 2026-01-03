content = """import { memo, useMemo } from 'react'
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
}

function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  icon,
  fullWidth = false,
  size = 'medium'
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

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

export default memo(Button)
"""

with open('src/components/common/Button.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Optimized: Button.tsx")
