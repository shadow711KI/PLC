import { memo, useState, useCallback } from 'react'
import './IconPicker.css'

interface IconPickerProps {
  currentIcon: string
  onSelect: (icon: string) => void
  onClose: () => void
}

const COMMON_ICONS = [
  '🛋️', '🛏️', '👧', '💼', '🚿', '🏋️', '🪜', '🏠',
  '🪟', '🚪', '🏡', '🌳', '🌞', '🌙', '⭐', '💡',
  '📱', '💻', '🎮', '📺', '🎬', '🎵', '📚', '🎨'
]

function IconPicker({ currentIcon, onSelect, onClose }: IconPickerProps) {
  const [customIcon, setCustomIcon] = useState(currentIcon)

  // Memoize icon selection handler
  const handleIconSelect = useCallback((icon: string) => {
    onSelect(icon)
    onClose()
  }, [onSelect, onClose])

  // Memoize custom icon submission handler
  const handleCustomIconSubmit = useCallback(() => {
    if (customIcon.trim()) {
      onSelect(customIcon.trim())
      onClose()
    }
  }, [customIcon, onSelect, onClose])

  // Escape key handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  return (
    <div
      className="icon-picker-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="icon-picker-title"
    >
      <div
        className="icon-picker-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="icon-picker-header">
          <h3 id="icon-picker-title" className="icon-picker-header__title">Icon auswählen</h3>
          <button
            onClick={onClose}
            className="icon-picker-header__close-button"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="icon-picker-grid" role="list">
          {COMMON_ICONS.map(icon => (
            <button
              key={icon}
              onClick={() => handleIconSelect(icon)}
              className={`icon-picker-grid__button ${icon === currentIcon ? 'icon-picker-grid__button--selected' : ''}`}
              aria-label={`Icon ${icon} auswählen`}
              aria-pressed={icon === currentIcon}
              role="listitem"
            >
              {icon}
            </button>
          ))}
        </div>

        <div className="icon-picker-custom">
          <label className="icon-picker-custom__label" htmlFor="custom-icon-input">
            Oder eigenes Emoji eingeben:
          </label>
          <div className="icon-picker-custom__input-row">
            <input
              id="custom-icon-input"
              type="text"
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              placeholder="🏠"
              className="icon-picker-custom__input"
              aria-label="Eigenes Emoji eingeben"
            />
            <button
              onClick={handleCustomIconSubmit}
              disabled={!customIcon.trim()}
              className={`icon-picker-custom__button ${customIcon.trim() ? 'icon-picker-custom__button--enabled' : ''}`}
              aria-label="Eigenes Emoji bestätigen"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(IconPicker)
