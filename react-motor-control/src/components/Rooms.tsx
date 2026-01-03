import { Motor } from '../App'
import './Rooms.css'
import { useState, useMemo, useEffect } from 'react'

interface RoomsProps {
  motors: Motor[]
  groups: Record<string, string[]>
  groupOrder: string[]
  roomIcons: Record<string, string>
  onUpdateGroupOrder: (order: string[]) => void
  selectedMotor: Motor | null
  onSelectMotor: (motor: Motor) => void
  onAction: (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
  onGroupAction: (motors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
  isLoading: boolean
  errorMessage: string | null
  moveMode: boolean
}

interface Group {
  name: string
  windows: string[]
  motors: Motor[]
}

// Icons für verschiedene Gruppen
const getGroupIcon = (groupName: string): string => {
  const name = groupName.toLowerCase()
  if (name.includes('wohn')) return '🏠'
  if (name.includes('schlaf')) return '🛏️'
  if (name.includes('arbeit')) return '💼'
  if (name.includes('bad')) return '🚿'
  return '👥'
}
// Fallback Icon für Fenster
const getRoomIcon = (roomName: string): string => {
  const name = roomName.toLowerCase()
  if (name.includes('wohnen')) return '🛌️'
  if (name.includes('schlafen') || name.includes('ankleide')) return '🛌️'
  if (name.includes('anna') || name.includes('frida')) return '👧'
  if (name.includes('arbeiten')) return '💼'
  if (name.includes('bad')) return '🚿'
  if (name.includes('fitness')) return '🏋️'
  if (name.includes('treppe')) return '🪜'
  return '🏠'
}
export default function Rooms({ motors, groups, groupOrder, roomIcons, onUpdateGroupOrder, selectedMotor, onSelectMotor, onAction, onGroupAction, isLoading, errorMessage, moveMode }: RoomsProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedWindow, setSelectedWindow] = useState<Motor | null>(null)
  const [markedGroupIndex, setMarkedGroupIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!moveMode) {
      setMarkedGroupIndex(null)
    }
  }, [moveMode])

  useEffect(() => {
    if (moveMode && selectedGroup) {
      setSelectedGroup(null)
    }
  }, [moveMode, selectedGroup])

  // Gruppiere Motoren nach Gruppen
  const groupList: Group[] = useMemo(() => {
    const groupMap = new Map<string, Motor[]>()
    
    Object.entries(groups).forEach(([groupName, windowNames]) => {
      const groupMotors: Motor[] = []
      windowNames.forEach(windowName => {
        const windowMotors = motors.filter(m => m.displayName === windowName)
        groupMotors.push(...windowMotors)
      })
      groupMap.set(groupName, groupMotors)
    })
    
    const groupsArray = Array.from(groupMap.entries())
      .map(([name, motors]) => ({
        name,
        windows: groups[name] || [],
        motors
      }))
    
    // Sortiere nach gespeicherter Reihenfolge
    if (groupOrder.length > 0) {
      return groupsArray.sort((a, b) => {
        const indexA = groupOrder.indexOf(a.name)
        const indexB = groupOrder.indexOf(b.name)
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    }
    
    return groupsArray.sort((a, b) => a.name.localeCompare(b.name))
  }, [motors, groups, groupOrder])
  
  const handleAction = (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close', e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectMotor(motor)
    onAction(motor, action)
  }
  const handleGroupClick = (groupName: string) => {
    setSelectedGroup(groupName)
  }
  const handleBack = () => {
    setSelectedGroup(null)
  }
  
  // Zeige Gruppenübersicht
  if (!selectedGroup) {
    // Verschiebemodus: Klick auf eine Kachel markiert sie, Klick auf eine zweite verschiebt die markierte an die neue Position
    const handleGroupTileClick = (index: number) => {
      if (!moveMode) {
        setSelectedGroup(groupList[index].name);
        return;
      }
      if (markedGroupIndex === null) {
        setMarkedGroupIndex(index);
      } else if (markedGroupIndex === index) {
        setMarkedGroupIndex(null); // Doppelklick auf gleiche Kachel: Markierung aufheben
      } else {
        // Verschiebe die markierte Kachel an die neue Position
        const newGroups = [...groupList];
        const [removed] = newGroups.splice(markedGroupIndex, 1);
        newGroups.splice(index, 0, removed);
        onUpdateGroupOrder(newGroups.map(g => g.name));
        setMarkedGroupIndex(null);
      }
    };
    return (
      <div className="rooms-screen">
        <div className="header">
          <h1>Räume</h1>
          {moveMode && (
            <div className="move-mode-pill" title="Verschiebemodus aktiv">
              🔁 Verschiebemodus
            </div>
          )}
        </div>
        {errorMessage && (
          <div className="error-message-global">
            ⚠️ {errorMessage}
          </div>
        )}
        <div className="group-grid">
          {groupList.map((group, index) => {
            const motorCount = group.motors.length;
            const activeCount = group.motors.filter(m => m.status && m.status !== '□').length;
            const isMarked = markedGroupIndex === index && moveMode;
            return (
              <div
                key={group.name}
                className={`group-tile${isMarked ? ' marked' : ''}`}
                onClick={() => handleGroupTileClick(index)}
                style={{
                  opacity: isMarked ? 0.7 : 1,
                  borderColor: isMarked ? '#ffa500' : undefined,
                  boxShadow: isMarked ? '0 0 0 3px #ffa50055' : undefined,
                  cursor: moveMode ? 'pointer' : 'default',
                }}
              >
                <div className="group-icon">{getGroupIcon(group.name)}</div>
                <div className="group-name">{group.name}</div>
                <div className="group-info">
                  {motorCount > 1 ? `${motorCount} Motoren` : '1 Motor'}
                  {activeCount > 0 && (
                    <span className="group-active"> • {activeCount} aktiv</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Zeige Motorsteuerung für ausgewählte Gruppe
  const currentGroup = groupList.find(g => g.name === selectedGroup)
  if (!currentGroup) return null
  
  // Zeige Einzelfenster-Steuerung
  if (selectedWindow) {
    const motor = selectedWindow
    return (
      <div className="rooms-screen">
        <div className="header">
          <h1>{motor.displayName}</h1>
        </div>
        
        {errorMessage && (
          <div className="error-message-global">
            ⚠️ {errorMessage}
          </div>
        )}
        
        <div className="group-control-panel">
          <div className="group-control-section">
            <h2>Steuerung:</h2>
            <div className="group-controls">
              <button 
                className="group-btn group-btn-up"
                onClick={(e) => handleAction(motor, 'up', e)}
                disabled={isLoading && selectedMotor?.id === motor.id}
                title="Hoch"
              >
                <span className="btn-icon">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '△'}</span>
                <span className="btn-label">Hoch</span>
              </button>
              
              <button 
                className="group-btn group-btn-down"
                onClick={(e) => handleAction(motor, 'down', e)}
                disabled={isLoading && selectedMotor?.id === motor.id}
                title="Runter"
              >
                <span className="btn-icon">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '▽'}</span>
                <span className="btn-label">Runter</span>
              </button>
              
              <button 
                className="group-btn group-btn-lamellen-open"
                onClick={(e) => handleAction(motor, 'lamellen_open', e)}
                disabled={isLoading && selectedMotor?.id === motor.id}
                title="Lamellen öffnen"
              >
                <span className="btn-icon">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '☀️'}</span>
                <span className="btn-label">Öffnen</span>
              </button>
              
              <button 
                className="group-btn group-btn-stop"
                onClick={(e) => handleAction(motor, 'stop', e)}
                disabled={isLoading && selectedMotor?.id === motor.id}
                title="Stop"
              >
                <span className="btn-icon">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '□'}</span>
                <span className="btn-label">Stop</span>
              </button>
              
              <button 
                className="group-btn group-btn-lamellen-close"
                onClick={(e) => handleAction(motor, 'lamellen_close', e)}
                disabled={isLoading && selectedMotor?.id === motor.id}
                title="Lamellen schließen"
              >
                <span className="btn-icon">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '🌑'}</span>
                <span className="btn-label">Schließen</span>
              </button>
              
              <button 
                className="group-btn group-btn-back"
                onClick={(e) => { e.stopPropagation(); setSelectedWindow(null); }}
                title="Zurück zur Gruppe"
              >
                <span className="btn-icon">🔙</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Zeige Gruppensteuerung
  return (
    <div className="rooms-screen">
      <div className="header">
        <h1>{getGroupIcon(currentGroup.name)} {currentGroup.name}</h1>
      </div>
      
      {errorMessage && (
        <div className="error-message-global">
          ⚠️ {errorMessage}
        </div>
      )}
      
      <div className="group-control-panel">
        <div className="group-control-section">
          <h2>Steuerung für alle Fenster:</h2>
          <div className="group-controls">
            <button 
              className="group-btn group-btn-up"
              onClick={() => onGroupAction(currentGroup.motors, 'up')}
              disabled={isLoading}
              title="Alle Fenster hochfahren"
            >
              <span className="btn-icon">{isLoading ? '⏳' : '△'}</span>
              <span className="btn-label">Hoch</span>
            </button>
            
            <button 
              className="group-btn group-btn-down"
              onClick={() => onGroupAction(currentGroup.motors, 'down')}
              disabled={isLoading}
              title="Alle Fenster runterfahren"
            >
              <span className="btn-icon">{isLoading ? '⏳' : '▽'}</span>
              <span className="btn-label">Runter</span>
            </button>
            
            <button 
              className="group-btn group-btn-lamellen-open"
              onClick={() => onGroupAction(currentGroup.motors, 'lamellen_open')}
              disabled={isLoading}
              title="Alle Lamellen öffnen"
            >
              <span className="btn-icon">{isLoading ? '⏳' : '☀️'}</span>
              <span className="btn-label">Lamellen öffnen</span>
            </button>
            
            <button 
              className="group-btn group-btn-stop"
              onClick={() => onGroupAction(currentGroup.motors, 'stop')}
              disabled={isLoading}
              title="Alle Fenster stoppen"
            >
              <span className="btn-icon">{isLoading ? '⏳' : '□'}</span>
              <span className="btn-label">Stop</span>
            </button>
            
            <button 
              className="group-btn group-btn-lamellen-close"
              onClick={() => onGroupAction(currentGroup.motors, 'lamellen_close')}
              disabled={isLoading}
              title="Alle Lamellen schließen"
            >
              <span className="btn-icon">{isLoading ? '⏳' : '🌑'}</span>
              <span className="btn-label">Lamellen schließen</span>
            </button>
            
            <button 
              className="group-btn group-btn-back"
              onClick={handleBack}
              title="Zurück zur Raumübersicht"
            >
              <span className="btn-icon">🔙</span>
            </button>
          </div>
        </div>
        
        <div className="group-info-section">
          <h2>Fenster in dieser Gruppe:</h2>
          <div className="motor-grid">
            {currentGroup.motors.map((motor) => {
              const currentIcon = roomIcons[motor.displayName] || getRoomIcon(motor.displayName)
              return (
                <div 
                  key={motor.id}
                  className={`motor-tile clickable ${isLoading && selectedMotor?.id === motor.id ? 'loading' : ''}`}
                  onClick={() => setSelectedWindow(motor)}
                >
                  <div className="tile-icon">{currentIcon}</div>
                  <div className="tile-header">
                    <div className="motor-name">{motor.displayName}</div>
                    <div className="motor-status">{motor.status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}