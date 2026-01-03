import { Screen } from '../App'
import './Navigation.css'

interface NavigationProps {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  moveMode: boolean
  onToggleMoveMode: () => void
  groupMoveMode: boolean
  onToggleGroupMoveMode: () => void
}

export default function Navigation({ currentScreen, onNavigate, moveMode, onToggleMoveMode, groupMoveMode, onToggleGroupMoveMode }: NavigationProps) {
  // Bestimme, ob Verschieben-Modus aktiv ist (entweder für Fenster oder Räume)
  const isMoveModeActive = (currentScreen === 'main' && moveMode) || (currentScreen === 'rooms' && groupMoveMode)
  
  // Toggle-Funktion für den gemeinsamen Verschieben-Button
  const handleToggleMove = () => {
    if (currentScreen === 'main') {
      onToggleMoveMode()
    } else if (currentScreen === 'rooms') {
      onToggleGroupMoveMode()
    }
  }
  
  return (
    <div className="navigation">
      <button 
        className={`nav-btn ${currentScreen === 'main' ? 'active' : ''}`}
        onClick={() => onNavigate('main')}
        title="Fenster"
      >
        🪟
      </button>
      <button 
        className={`nav-btn ${currentScreen === 'rooms' ? 'active' : ''}`}
        onClick={() => onNavigate('rooms')}
        title="Räume"
      >
        🚪
      </button>
      {(currentScreen === 'main' || currentScreen === 'rooms') && (
        <button
          className={`nav-btn move-btn ${isMoveModeActive ? 'active' : ''}`}
          onClick={handleToggleMove}
          title={isMoveModeActive ? 'Verschiebemodus beenden' : 'Verschieben'}
        >
          🔁
        </button>
      )}
      <button
        className={`nav-btn ${currentScreen === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
        title="Einstellungen"
      >
        ⚙️
      </button>
    </div>
  )
}
