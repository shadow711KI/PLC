# Header.tsx - simple memo
header_content = """import { memo } from 'react'
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
"""

# LoadingBar.tsx - simple memo
loadingbar_content = """import { memo } from 'react'
import './LoadingBar.css'

interface LoadingBarProps {
  message?: string
}

function LoadingBar({ message = 'Lese SPS-Daten...' }: LoadingBarProps) {
  return (
    <div className="loading-bar">
      ⏳ {message}
      <div className="loading-bar__track">
        <div className="loading-bar__progress" />
      </div>
    </div>
  )
}

export default memo(LoadingBar)
"""

# ErrorMessage.tsx - simple memo
errormessage_content = """import { memo } from 'react'
import './ErrorMessage.css'

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-message">
      <span>❌ {message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="error-message__close-button"
          aria-label="Schließen"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default memo(ErrorMessage)
"""

# Write files
with open('src/components/common/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(header_content)
print("Optimized: Header.tsx")

with open('src/components/common/LoadingBar.tsx', 'w', encoding='utf-8') as f:
    f.write(loadingbar_content)
print("Optimized: LoadingBar.tsx")

with open('src/components/common/ErrorMessage.tsx', 'w', encoding='utf-8') as f:
    f.write(errormessage_content)
print("Optimized: ErrorMessage.tsx")
