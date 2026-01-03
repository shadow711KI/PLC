import { memo } from 'react'
import './Header.css'

interface HeaderProps {
  title: string
  onBack?: () => void
  rightButton?: React.ReactNode
}

function Header({ title, onBack, rightButton }: HeaderProps) {
  return (
    <div className="settings__header">
      <div className="header__container">
        {onBack && (
          <button
            className="header__back-button"
            onClick={onBack}
            aria-label="Zurück"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L10 14L18 22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 className="header__title">
          {title}
        </h1>
        {rightButton && (
          <div className="header__right-button-wrapper">
            {rightButton}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(Header)
