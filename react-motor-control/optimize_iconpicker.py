content = """import { memo, useState, useCallback } from 'react'
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

  return (
    <div className="icon-picker-overlay">
      <div className="icon-picker-modal">
        <div className="icon-picker-header">
          <h3 className="icon-picker-header__title">Icon auswählen</h3>
          <button
            onClick={onClose}
            className="icon-picker-header__close-button"
          >
            ✕
          </button>
        </div>

        <div className="icon-picker-grid">
          {COMMON_ICONS.map(icon => (
            <button
              key={icon}
              onClick={() => handleIconSelect(icon)}
              className={`icon-picker-grid__button ${icon === currentIcon ? 'icon-picker-grid__button--selected' : ''}`}
            >
              {icon}
            </button>
          ))}
        </div>

        <div className="icon-picker-custom">
          <label className="icon-picker-custom__label">
            Oder eigenes Emoji eingeben:
          </label>
          <div className="icon-picker-custom__input-row">
            <input
              type="text"
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              placeholder="🏠"
              className="icon-picker-custom__input"
            />
            <button
              onClick={handleCustomIconSubmit}
              disabled={!customIcon.trim()}
              className={`icon-picker-custom__button ${customIcon.trim() ? 'icon-picker-custom__button--enabled' : ''}`}
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
"""

with open('src/components/common/IconPicker.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Optimized: IconPicker.tsx")
