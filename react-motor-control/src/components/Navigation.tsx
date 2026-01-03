import { memo, useCallback, useMemo } from 'react'
import { useUI } from '../contexts/UIContext'
import './Navigation.css'

function Navigation() {
  const { currentScreen, setCurrentScreen, moveMode, setMoveMode, groupMoveMode, setGroupMoveMode } = useUI()

  // Bestimme, ob Verschieben-Modus aktiv ist (entweder für Fenster oder Räume)
  // Memoized to prevent unnecessary re-calculations
  const isMoveModeActive = useMemo(
    () => (currentScreen === 'main' && moveMode) || (currentScreen === 'rooms' && groupMoveMode),
    [currentScreen, moveMode, groupMoveMode]
  )

  // Navigation handler - memoized to prevent unnecessary re-renders of child components
  const handleNavigate = useCallback((screen: 'main' | 'settings' | 'rooms') => {
    setCurrentScreen(screen)
    if (screen !== 'main') {
      setMoveMode(false)
    }
    if (screen !== 'rooms') {
      setGroupMoveMode(false)
    }
  }, [setCurrentScreen, setMoveMode, setGroupMoveMode])

  // Toggle-Funktion für den gemeinsamen Verschieben-Button
  // Memoized to prevent unnecessary re-renders
  const handleToggleMove = useCallback(() => {
    if (currentScreen === 'main') {
      setMoveMode(prev => !prev)
    } else if (currentScreen === 'rooms') {
      setGroupMoveMode(prev => !prev)
    }
  }, [currentScreen, setMoveMode, setGroupMoveMode])
  
  return (
    <nav className="navigation" role="navigation" aria-label="Hauptnavigation">
      <button
        className={`nav-btn ${currentScreen === 'main' ? 'active' : ''}`}
        onClick={() => handleNavigate('main')}
        title="Fenster"
        aria-label="Fenster"
        aria-current={currentScreen === 'main' ? 'page' : undefined}
      >
        <span aria-hidden="true">🪟</span>
      </button>
      <button
        className={`nav-btn ${currentScreen === 'rooms' ? 'active' : ''}`}
        onClick={() => handleNavigate('rooms')}
        title="Räume"
        aria-label="Räume"
        aria-current={currentScreen === 'rooms' ? 'page' : undefined}
      >
        <span aria-hidden="true">🚪</span>
      </button>
      {(currentScreen === 'main' || currentScreen === 'rooms') && (
        <button
          className={`nav-btn move-btn ${isMoveModeActive ? 'active' : ''}`}
          onClick={handleToggleMove}
          title={isMoveModeActive ? 'Verschiebemodus beenden' : 'Verschieben'}
          aria-label={isMoveModeActive ? 'Verschiebemodus beenden' : 'Verschiebemodus aktivieren'}
          aria-pressed={isMoveModeActive}
        >
          <span aria-hidden="true">🔁</span>
        </button>
      )}
      <button
        className={`nav-btn ${currentScreen === 'settings' ? 'active' : ''}`}
        onClick={() => handleNavigate('settings')}
        title="Einstellungen"
        aria-label="Einstellungen"
        aria-current={currentScreen === 'settings' ? 'page' : undefined}
      >
        <span aria-hidden="true">⚙️</span>
      </button>
    </nav>
  )
}

export default memo(Navigation)
