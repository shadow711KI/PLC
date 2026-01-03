import { memo } from 'react'
import './LoadingBar.css'

interface LoadingBarProps {
  message?: string
}

function LoadingBar({ message = 'Lese SPS-Daten...' }: LoadingBarProps) {
  return (
    <div className="loading-bar" role="status" aria-live="polite" aria-busy="true">
      <span>
        <span aria-hidden="true">⏳</span> {message}
      </span>
      <div className="loading-bar__track" aria-hidden="true">
        <div className="loading-bar__progress" />
      </div>
    </div>
  )
}

export default memo(LoadingBar)
