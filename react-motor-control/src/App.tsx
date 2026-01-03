import { useState, useEffect } from 'react'
import MotorList from './components/MotorList'
import Settings from './components/Settings'
import Rooms from './components/Rooms'
import Navigation from './components/Navigation'
import { sendMotorCommand } from './api/motorApi'
import './App.css'

export type Screen = 'main' | 'settings' | 'rooms'

export interface Motor {
  id: number
  name: string
  technicalName: string;
  displayName: string
  sps: string
  status: string
  type?: 'jalousie' | 'rollladen'
}

// SPS Mapping
const spsMapping: Record<string, { host: string; port: number }> = {
  SPS1: { host: '192.168.178.234', port: 1001 },
  SPS2: { host: '192.168.178.234', port: 1002 },
  SPS3: { host: '192.168.178.235', port: 1003 },
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main')
  const [selectedMotor, setSelectedMotor] = useState<Motor | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [motors, setMotors] = useState<Motor[]>([])
  const [roomIcons, setRoomIcons] = useState<Record<string, string>>({})
  const [roomOrder, setRoomOrder] = useState<string[]>([])
  const [moveMode, setMoveMode] = useState(false)
  const [groups, setGroups] = useState<Record<string, string[]>>({})
  const [groupOrder, setGroupOrder] = useState<string[]>([])
  const [groupMoveMode, setGroupMoveMode] = useState(false)

  // Lade Motor-Konfiguration und Raum-Order vom Server
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? `http://${window.location.hostname}:3001`
          : 'http://localhost:3001'
        
        const response = await fetch(`${API_BASE_URL}/api/motors/config`)
        if (response.ok) {
          const config = await response.json()
          const motorsData = config.motors.map((m: any) => ({
            id: m.id,
            name: m.displayName, // name is the display name for UI
            technicalName: m.technicalName, // technicalName is the backend key
            displayName: m.displayName,
            sps: m.sps,
            status: '△',
            type: m.type || 'jalousie'
          }))
          setMotors(motorsData)
        }
        // Lade Raum-Icons und Reihenfolge
        const roomResponse = await fetch(`${API_BASE_URL}/api/rooms/config`)
        if (roomResponse.ok) {
          const roomConfig = await roomResponse.json()
          const icons: Record<string, string> = {}
          Object.entries(roomConfig.rooms || {}).forEach(([roomName, data]: [string, any]) => {
            icons[roomName] = data.icon
          })
          setRoomIcons(icons)
          if (Array.isArray(roomConfig.order)) {
            setRoomOrder(roomConfig.order)
          }
        }
        // Lade Gruppen-Konfiguration
        const groupsResponse = await fetch(`${API_BASE_URL}/api/groups/config`)
        if (groupsResponse.ok) {
          const groupsConfig = await groupsResponse.json()
          setGroups(groupsConfig.groups || {})
          if (Array.isArray(groupsConfig.order)) {
            setGroupOrder(groupsConfig.order)
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Motor-Konfiguration:', error)
      }
    }
    loadConfig()
  }, [])

  // Speichere roomOrder auf dem Server
  const handleUpdateRoomOrder = async (order: string[]) => {
    setRoomOrder(order)
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      await fetch(`${API_BASE_URL}/api/rooms/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Raum-Reihenfolge:', error)
    }
  }

  // Speichere groupOrder auf dem Server
  const handleUpdateGroupOrder = async (order: string[]) => {
    setGroupOrder(order)
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      await fetch(`${API_BASE_URL}/api/groups/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Gruppen-Reihenfolge:', error)
    }
  }


  const handleMotorSelect = (motor: Motor) => {
    setSelectedMotor(motor)
    setErrorMessage(null)
  }

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen)
    setSelectedMotor(null)
    if (screen !== 'main') {
      setMoveMode(false)
    }
    if (screen !== 'rooms') {
      setGroupMoveMode(false)
    }
  }

  const updateMotorName = async (motorName: string, newDisplayName: string) => {
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      
      const response = await fetch(`${API_BASE_URL}/api/motors/update-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicalName: motorName, displayName: newDisplayName })
      })
      
      if (response.ok) {
        // Aktualisiere lokalen State
        setMotors(prev => prev.map(m => 
          m.name === motorName ? { ...m, displayName: newDisplayName } : m
        ))
        return true
      }
      return false
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Motor-Namens:', error)
      return false
    }
  }

  const updateRoomIcon = async (roomName: string, icon: string) => {
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      
      const response = await fetch(`${API_BASE_URL}/api/rooms/update-icon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, icon })
      })
      
      if (response.ok) {
        // Aktualisiere lokalen State
        setRoomIcons(prev => ({ ...prev, [roomName]: icon }))
        return true
      }
      return false
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Raum-Icons:', error)
      return false
    }
  }

  const updateGroup = async (groupName: string, windows: string[]) => {
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      
      const response = await fetch(`${API_BASE_URL}/api/groups/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName, windows })
      })
      
      if (response.ok) {
        // Aktualisiere lokalen State
        setGroups(prev => ({ ...prev, [groupName]: windows }))
        return true
      }
      return false
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Gruppe:', error)
      return false
    }
  }

  const deleteGroup = async (groupName: string) => {
    try {
      const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? `http://${window.location.hostname}:3001`
        : 'http://localhost:3001'
      
      const response = await fetch(`${API_BASE_URL}/api/groups/${encodeURIComponent(groupName)}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Aktualisiere lokalen State
        setGroups(prev => {
          const newGroups = { ...prev }
          delete newGroups[groupName]
          return newGroups
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Fehler beim Löschen der Gruppe:', error)
      return false
    }
  }

  const handleAction = async (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {
    const actionMap = {
      up: 'hoch',
      down: 'runter',
      stop: 'stop',
      lamellen_open: 'lamellen_oeffnen',
      lamellen_close: 'lamellen_schliessen'
    } as const

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const spsInfo = spsMapping[motor.sps]
      const result = await sendMotorCommand({
        motor: motor.name,
        action: actionMap[action],
        sps: spsInfo.host,
        port: spsInfo.port,
      })

      if (result.success && result.motorStatus) {
        // Aktualisiere Status von Server-Response
        setMotors(prev => prev.map(m => ({
          ...m,
          status: result.motorStatus?.[m.name] || m.status
        })))
      } else if (!result.success) {
        setErrorMessage(`Fehler: ${result.message}`)
      }
    } catch (error) {
      setErrorMessage('Verbindung zum Server fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupAction = async (groupMotors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {
    const actionMap = {
      up: 'hoch',
      down: 'runter',
      stop: 'stop',
      lamellen_open: 'lamellen_oeffnen',
      lamellen_close: 'lamellen_schliessen'
    } as const

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Sende Befehle nacheinander an alle Motoren in der Gruppe
      for (const motor of groupMotors) {
        const spsInfo = spsMapping[motor.sps]
        const result = await sendMotorCommand({
          motor: motor.name,
          action: actionMap[action],
          sps: spsInfo.host,
          port: spsInfo.port,
        })

        if (result.success && result.motorStatus) {
          // Aktualisiere Status von Server-Response
          setMotors(prev => prev.map(m => ({
            ...m,
            status: result.motorStatus?.[m.name] || m.status
          })))
        } else if (!result.success) {
          setErrorMessage(`Fehler bei ${motor.displayName}: ${result.message}`)
          break // Stoppe bei Fehler
        }
        
        // Kurze Pause zwischen den Befehlen (100ms)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      setErrorMessage('Verbindung zum Server fehlgeschlagen')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      {currentScreen === 'main' && (
        <MotorList 
          motors={motors} 
          roomIcons={roomIcons}
          roomOrder={roomOrder}
          moveMode={moveMode}
          onUpdateRoomOrder={handleUpdateRoomOrder}
          selectedMotor={selectedMotor}
          onSelectMotor={handleMotorSelect}
          onAction={handleAction}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
      
      {currentScreen === 'settings' && (
        <Settings 
          motors={motors}
          roomIcons={roomIcons}
          groups={groups}
          onUpdateName={updateMotorName}
          onUpdateRoomIcon={updateRoomIcon}
          onUpdateGroup={updateGroup}
          onDeleteGroup={deleteGroup}
        />
      )}
      
      {currentScreen === 'rooms' && (
        <Rooms 
          motors={motors}
          groups={groups}
          groupOrder={groupOrder}
          roomIcons={roomIcons}
          moveMode={groupMoveMode}
          onUpdateGroupOrder={handleUpdateGroupOrder}
          selectedMotor={selectedMotor}
          onSelectMotor={handleMotorSelect}
          onAction={handleAction}
          onGroupAction={handleGroupAction}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
      
      <Navigation 
        currentScreen={currentScreen} 
        onNavigate={handleNavigate} 
        moveMode={moveMode}
        onToggleMoveMode={() => {
          if (currentScreen !== 'main') return
          setMoveMode(prev => !prev)
        }}
        groupMoveMode={groupMoveMode}
        onToggleGroupMoveMode={() => {
          if (currentScreen !== 'rooms') return
          setGroupMoveMode(prev => !prev)
        }}
      />
    </div>
  )
}

export default App
