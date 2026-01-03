import { memo, useMemo, useCallback } from 'react'
import './ToggleSwitch.css'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'medium'
}: ToggleSwitchProps) {
  const dimensions = useMemo(() => ({
    small: { width: 36, height: 18, knobSize: 14 },
    medium: { width: 44, height: 22, knobSize: 18 },
    large: { width: 60, height: 30, knobSize: 26 }
  }), [])

  const { width, height, knobSize } = dimensions[size]
  
  // Memoize computed values
  const knobOffset = useMemo(
    () => checked ? (width - knobSize - 2) : 2,
    [checked, width, knobSize]
  )

  const trackStyle = useMemo(() => ({
    width,
    height,
    backgroundColor: checked ? '#4CAF50' : '#ccc',
    borderRadius: height / 2
  }), [width, height, checked])

  const knobStyle = useMemo(() => ({
    width: knobSize,
    height: knobSize,
    left: knobOffset
  }), [knobSize, knobOffset])

  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked)
    }
  }, [disabled, checked, onChange])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!disabled) {
      e.preventDefault()
      onChange(!checked)
    }
  }, [disabled, checked, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      onChange(!checked)
    }
  }, [disabled, checked, onChange])

  return (
    <div className={`toggle-switch ${disabled ? 'toggle-switch--disabled' : ''}`}>
      {label && (
        <span
          className={`toggle-switch__label toggle-switch__label--${size} ${checked ? 'toggle-switch__label--checked' : ''}`}
          id={label ? `toggle-label-${label.replace(/\s/g, '-')}` : undefined}
        >
          {label}
        </span>
      )}
      <div
        className={`toggle-switch__track ${disabled ? 'toggle-switch__track--disabled' : ''}`}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        style={trackStyle}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={label ? `toggle-label-${label.replace(/\s/g, '-')}` : undefined}
        aria-label={!label ? (checked ? 'Eingeschaltet' : 'Ausgeschaltet') : undefined}
        tabIndex={disabled ? -1 : 0}
      >
        <div
          className="toggle-switch__knob"
          style={knobStyle}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

export default memo(ToggleSwitch)
