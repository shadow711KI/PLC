import { memo } from 'react'
import './ErrorMessage.css'

interface ErrorMessageProps {
  message: string
  onDismiss?: () => void
}

function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert" aria-live="assertive">
      <span>
        <span aria-hidden="true">❌</span> {message}
      </span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="error-message__close-button"
          aria-label="Fehlermeldung schließen"
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
    </div>
  )
}

export default memo(ErrorMessage)
