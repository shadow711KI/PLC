import { useEffect, useCallback } from 'react'
import MotorList from './components/MotorList'
import Settings from './components/Settings'
import Rooms from './components/Rooms'
import Navigation from './components/Navigation'
import { sendMotorCommand } from './api/motorApi'
import { getApiBaseUrl } from './api/getApiBaseUrl'
import { Motor, DEFAULT_SPS_MAPPING, MotorConfigResponse, RoomConfigResponse, GroupConfigResponse } from './types'
import { useMotors } from './contexts/MotorContext'
import { useUI } from './contexts/UIContext'
import './App.css'

// SPS Mapping
const spsMapping = DEFAULT_SPS_MAPPING

function App() {
  const API_BASE_URL = getApiBaseUrl()

  // Use context hooks instead of local state
  const {
    motors,
    setMotors,
    roomIcons,
    setRoomIcons,
    setRoomOrder,
    groups,
    setGroups,
    setGroupOrder,
  } = useMotors()

  const {
    currentScreen,
    setCurrentScreen,
    setIsLoading,
    setErrorMessage,
  } = useUI()

  // Lade Motor-Konfiguration und Raum-Order vom Server
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/motors/config`)
        if (response.ok) {
          const config: MotorConfigResponse = await response.json()
          const motorsData: Motor[] = config.motors.map((m) => ({
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
          const roomConfig: RoomConfigResponse = await roomResponse.json()
          const icons: Record<string, string> = {}
          Object.entries(roomConfig.rooms || {}).forEach(([roomName, data]) => {
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
          const groupsConfig: GroupConfigResponse = await groupsResponse.json()
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
  }, [setMotors, setRoomIcons, setRoomOrder, setGroups, setGroupOrder])

  // Memoized to prevent unnecessary re-renders of child components
  const updateMotorName = useCallback(async (motorName: string, newDisplayName: string) => {
    try {
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
  }, [setMotors])

  // Memoized to prevent unnecessary re-renders of child components
  const updateRoomIcon = useCallback(async (roomName: string, icon: string) => {
    try {
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
  }, [setRoomIcons])

  // Memoized to prevent unnecessary re-renders of child components
  const updateGroup = useCallback(async (groupName: string, windows: string[]) => {
    try {
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
  }, [setGroups])

  // Memoized to prevent unnecessary re-renders of child components
  const deleteGroup = useCallback(async (groupName: string) => {
    try {
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
  }, [setGroups])

  // Memoized to prevent unnecessary re-renders of child components
  const handleAction = useCallback(async (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {
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
        motor: motor.technicalName,
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
  }, [setIsLoading, setErrorMessage, setMotors])

  // Memoized to prevent unnecessary re-renders of child components
  const handleGroupAction = useCallback(async (groupMotors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {
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
          motor: motor.technicalName,
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
  }, [setIsLoading, setErrorMessage, setMotors])

  return (
    <div className="app">
      {currentScreen === 'main' && (
        <MotorList
          onAction={handleAction}
        />
      )}

      {currentScreen === 'settings' && (
        <Settings
          motors={motors}
          roomIcons={roomIcons}
          groups={groups}
          onUpdateName={updateMotorName}
          onUpdateRoomIcon={updateRoomIcon}
          onUpdateGroups={async (groups, order) => {
            setGroups(groups)
            setGroupOrder(order)
            return true
          }}
          onUpdateGroup={updateGroup}
          onDeleteGroup={deleteGroup}
          onBack={() => setCurrentScreen('main')}
        />
      )}

      {currentScreen === 'rooms' && (
        <Rooms
          onAction={handleAction}
          onGroupAction={handleGroupAction}
        />
      )}

      <Navigation />
    </div>
  )
}

export default App
