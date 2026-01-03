import { Motor, Room } from '../types'
import { useMotors } from '../contexts/MotorContext'
import { useUI } from '../contexts/UIContext'
import './MotorList.css'
import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import React from 'react'

// Real SPS status fetching
const API_BASE_URL = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001'

// ⚙️ LAMELLEN-STUFEN KONFIGURATION (in Millisekunden)
// Separate Einstellungen für Öffnen und Schließen
// WICHTIG: Motor braucht Mindestlaufzeit (~400ms) um STOP zu akzeptieren!
const LAMELLEN_STUFEN_OEFFNEN = {
  stufe1: 150,   // 25% öffnen → 450ms (minimum für STOP-Verarbeitung)
  stufe2: 350,   // 50% öffnen → 900ms
  stufe3: 500,  // 75% öffnen → 1350ms
  stufe4: 800,  // 100% öffnen → 1800ms (komplett)
}

const LAMELLEN_STUFEN_SCHLIESSEN = {
  stufe1: 50,   // 25% schließen → 450ms (minimum für STOP-Verarbeitung)
  stufe2: 350,   // 50% schließen → 900ms
  stufe3: 450,  // 75% schließen → 1350ms
  stufe4: 800,  // 100% schließen → 1800ms (komplett)
}

// Icons für verschiedene Fenster
const getRoomIcon = (roomName: string): string => {
  const name = roomName.toLowerCase()
  if (name.includes('wohnen')) return '🛋️'
  if (name.includes('schlafen') || name.includes('ankleide')) return '🛏️'
  if (name.includes('anna') || name.includes('frida')) return '👧'
  if (name.includes('arbeiten')) return '💼'
  if (name.includes('bad')) return '🚿'
  if (name.includes('fitness')) return '🏋️'
  if (name.includes('treppe')) return '🪜'
  return '🏠'
}

// onAction prop is still needed from App.tsx for motor commands
interface MotorListProps {
  onAction: (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => void
}

function MotorList({ onAction }: MotorListProps) {
  // Use contexts instead of props
  const { motors, roomIcons, roomOrder, updateRoomOrder } = useMotors()
  const { selectedMotor, setSelectedMotor, isLoading, errorMessage, moveMode } = useUI()
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [markedRoomIndex, setMarkedRoomIndex] = useState<number | null>(null)

  // Real SPS status for all motors (technicalName → status string)
  const [realMotorStatus, setRealMotorStatus] = useState<Record<string, string>>({})
  // Track if status was ever loaded successfully
  const [statusLoaded, setStatusLoaded] = useState(false);


  // Fetch real SPS status for all motors on mount and after actions
  // Memoized to prevent unnecessary re-creation
  // Logging helper for stack traces
  const getShortStack = () => {
    const stack = new Error().stack?.split('\n').slice(2, 6).map(s => s.trim()).join(' | ');
    return stack;
  };

  const fetchAllSpsStatus = useCallback(async (reason = 'unknown') => {
    try {
      const spsNames = ['SPS1', 'SPS2', 'SPS3'];
      let allStatus: Record<string, string> = {};
      for (const spsName of spsNames) {
        console.log(`[fetchAllSpsStatus] Fetching status for ${spsName} | reason: ${reason} | stack: ${getShortStack()}`);
        const res = await fetch(`${API_BASE_URL}/api/sps/status/${spsName}`);
        const data = await res.json();
        if (data.success && data.data) {
          // Logge das empfangene Objekt vom Backend
          console.log(`[fetchAllSpsStatus] data.data von Backend (${spsName}):`, JSON.stringify(data.data));
          const spsMotorMap = data.data;
          // Debug: technicalNames aus motors und aus data.data loggen
          const frontendNames = motors.map(m => m.technicalName);
          const backendNames = Object.keys(spsMotorMap);
          console.log(`[fetchAllSpsStatus] technicalNames Frontend:`, frontendNames);
          console.log(`[fetchAllSpsStatus] technicalNames Backend:`, backendNames);

          // Test: Übernehme ALLE Statuswerte ohne Filter
          for (const [technicalName, statusObjRaw] of Object.entries(spsMotorMap)) {
            const statusObj = statusObjRaw as { status: string };
            allStatus[technicalName] = statusObj.status;
          }
        }
      }
      setRealMotorStatus(allStatus);
      // Logge explizit das Status-Objekt nach dem Setzen
      console.log('[fetchAllSpsStatus] allStatus (wird in State gesetzt):', JSON.stringify(allStatus));
      if (!statusLoaded) setStatusLoaded(true);
      console.log('SPS Status received:', allStatus, '| reason:', reason, '| stack:', getShortStack());
    } catch (e) {
      console.error('Fehler beim Laden der SPS-Status:', e, '| reason:', reason, '| stack:', getShortStack());
    }
  }, [motors, statusLoaded]);

  // On mount, fetch status once (not on every motors change)

  // Initialstatus-Refetch: State-gesteuert, reagiert auf realMotorStatus
  const [initStatusTries, setInitStatusTries] = useState(0);

  useEffect(() => {
    // Nur beim Mount: initialen Status laden
    console.log('[MotorList] useEffect[] triggered - initial mount | stack:', getShortStack());
    fetchAllSpsStatus('mount');
    setInitStatusTries(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Prüfe nach jedem Status-Update, ob noch ein Refetch nötig ist
    if (initStatusTries === 0 || initStatusTries >= 5) return;
    const hasUnknown = Object.values(realMotorStatus).some(
      (status) => !status || status === 'unbekannt' || status === '◇'
    );
    if (hasUnknown) {
      // Noch unvollständig: nach 500ms erneut versuchen
      const timeout = setTimeout(() => {
        console.log(`[MotorList] Initialstatus unvollständig, Refetch-Versuch ${initStatusTries + 1}`);
        fetchAllSpsStatus(`delayed-initial-${initStatusTries + 1}`);
        setInitStatusTries(t => t + 1);
      }, 500);
      return () => clearTimeout(timeout);
    }
    // Sobald ein valider Status da ist, keine weiteren Versuche
  }, [realMotorStatus, initStatusTries, fetchAllSpsStatus]);


  useEffect(() => {
    if (!moveMode) {
      setMarkedRoomIndex(null)
    }
  }, [moveMode])

  useEffect(() => {
    if (moveMode && selectedRoom) {
      setSelectedRoom(null)
    }
  }, [moveMode, selectedRoom])

  // Gruppiere Motoren nach Raum (nutze displayName als Raum)
  const rooms: Room[] = useMemo(() => {
    const roomMap = new Map<string, Motor[]>()

    motors.forEach(motor => {
      const roomName = motor.displayName
      if (!roomMap.has(roomName)) {
        roomMap.set(roomName, [])
      }
      roomMap.get(roomName)!.push(motor)
    })

    const roomsArray = Array.from(roomMap.entries())
      .map(([name, motors]) => ({
        name,
        motors,
        icon: roomIcons[name] || getRoomIcon(name)
      }))

    // Sortiere nach gespeicherter Reihenfolge
    if (roomOrder.length > 0) {
      return roomsArray.sort((a, b) => {
        const indexA = roomOrder.indexOf(a.name)
        const indexB = roomOrder.indexOf(b.name)
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
    }

    return roomsArray.sort((a, b) => a.name.localeCompare(b.name))
  }, [motors, roomIcons, roomOrder])

  // Memoized to prevent unnecessary re-renders of child components
  const handleAction = useCallback(async (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMotor(motor);
    await onAction(motor, action);
    // Nach Aktion: Status neu laden
    await fetchAllSpsStatus(`action:${motor.technicalName}:${action}`);
  }, [onAction, setSelectedMotor, fetchAllSpsStatus]);

  // Handler für stufenweises Lamellen-Öffnen/Schließen
  // Memoized to prevent unnecessary re-renders
  const handleLamellenStufe = useCallback(async (motor: Motor, direction: 'up' | 'down', ms: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMotor(motor);
    try {
      const response = await fetch(`${API_BASE_URL}/api/motor/lamellen-stufe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motor: motor.technicalName,
          direction,
          ms
        })
      });
      const result = await response.json();
      console.log('Lamellen-Stufe Response:', result);
      // Nach Aktion: Status neu laden
      await fetchAllSpsStatus(`lamellenStufe:${motor.technicalName}:${direction}:${ms}`);
    } catch (error) {
      console.error('Fehler bei Lamellen-Stufe:', error);
    }
  }, [setSelectedMotor, fetchAllSpsStatus]);
  // (removed unused handleRoomClick)
  // Memoized to prevent unnecessary re-renders
  const handleBack = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  // Map protocol status to icon

  // Get status icon for a motor
  // Memoized to prevent unnecessary re-calculations
  const getStatusIcon = useCallback((motor: Motor): string => {
    // Nur echter SPS-Status
    const status = realMotorStatus[motor.technicalName];
    const hasAnyStatus = Object.keys(realMotorStatus).length > 0;
    if (status === undefined && statusLoaded && hasAnyStatus) {
      // Nur loggen, wenn Status nach erstem erfolgreichen Laden und mindestens ein Statuswert vorhanden ist
      console.warn('[StatusIcon] Kein Status für', motor.technicalName, motor.displayName);
    }
    if (status === 'hoch') return '△';
    if (status === 'runter') return '▽';
    if (status === 'stop') return '▢';
    // Fallback: Logge den tatsächlichen Wert
    if (status !== undefined) {
      console.warn('[StatusIcon] Unerwarteter Statuswert im Frontend:', motor.technicalName, '| Wert:', status);
    }
    return '□';
  }, [realMotorStatus, statusLoaded])

  // Zeige Raumübersicht
  if (!selectedRoom) {
    // Verschiebemodus: Klick auf eine Kachel markiert sie, Klick auf eine zweite verschiebt die markierte an die neue Position
    const handleRoomTileClick = (index: number) => {
      if (!moveMode) {
        setSelectedRoom(rooms[index].name);
        return;
      }
      if (markedRoomIndex === null) {
        setMarkedRoomIndex(index);
      } else if (markedRoomIndex === index) {
        setMarkedRoomIndex(null); // Doppelklick auf gleiche Kachel: Markierung aufheben
      } else {
        // Verschiebe die markierte Kachel an die neue Position
        const newRooms = [...rooms];
        const [removed] = newRooms.splice(markedRoomIndex, 1);
        newRooms.splice(index, 0, removed);
        updateRoomOrder(newRooms.map(r => r.name));
        setMarkedRoomIndex(null);
      }
    };
    return (
      <div className="motor-list-screen">
        <div className="header">
          <h1 style={{ margin: 0 }}>Fenster</h1>
          {moveMode && (
            <div className="move-mode-pill" title="Verschiebemodus aktiv" aria-label="Verschiebemodus aktiv">
              🔁 Verschiebemodus
            </div>
          )}
        </div>
        {errorMessage && (
          <div className="error-message-global" role="alert" aria-live="polite">
            ⚠️ {errorMessage}
          </div>
        )}
        <div className="room-grid">
          {rooms.map((room, index) => {
            const isMarked = markedRoomIndex === index && moveMode;
            // Zeige Status-Icon für Raum: Wenn alle Motoren im Raum denselben Status, zeige diesen, sonst '□'
            const roomStatuses = room.motors.map(motor => getStatusIcon(motor));
            const unique = Array.from(new Set(roomStatuses));
            const roomStatus = unique.length === 1 ? unique[0] : '□';

            return (
              <div
                key={room.name}
                className={`room-tile${isMarked ? ' marked' : ''}`}
                onClick={() => handleRoomTileClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleRoomTileClick(index)
                  }
                }}
                style={{
                  opacity: isMarked ? 0.7 : 1,
                  borderColor: isMarked ? '#ffa500' : undefined,
                  boxShadow: isMarked ? '0 0 0 3px #ffa50055' : undefined,
                  cursor: moveMode ? 'pointer' : 'default',
                }}
                role="button"
                tabIndex={0}
                aria-label={`${room.name}, ${room.motors.length} ${room.motors.length === 1 ? 'Motor' : 'Motoren'}${isMarked ? ', markiert' : ''}`}
              >
                <div className="room-icon" aria-hidden="true">{room.icon}</div>
                <div className="room-name">{room.name}</div>
                <div
                  className="room-status-icon"
                  style={{
                    color: '#2196f3',
                    fontSize: '1.0em',
                    fontFamily: 'Segoe UI Symbol, Arial Unicode MS, Noto Sans Symbols, Noto Sans, sans-serif',
                    transition: 'opacity 0.2s',
                  }}
                  aria-hidden="true"
                >
                  {/* Immer ein Icon anzeigen, auch wenn Status noch nicht geladen */}
                  {['△', '▽', '▢'].includes(roomStatus) ? roomStatus : '◇'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Zeige Motorsteuerung für ausgewählten Raum
  const currentRoom = rooms.find(r => r.name === selectedRoom)
  if (!currentRoom) return null

  return (
    <div className="motor-list-screen">
      <div className="header">
        <h1>{currentRoom.icon} {currentRoom.name}</h1>
      </div>

      {errorMessage && (
        <div className="error-message-global">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="motor-grid">
        {currentRoom.motors.map((motor) => {
          const isJalousie = motor.type !== 'rollladen'
          return (
            <div
              key={motor.id}
              className={`motor-tile ${isLoading && selectedMotor?.id === motor.id ? 'loading' : ''}`}
            >
              <div className="tile-header">
                <div className="motor-name">{motor.displayName}</div>
                <div className="motor-status" style={{ color: '#2196f3', fontSize: '1.5rem' }}>
                  <span
                    style={{
                      color: '#1976d2',
                      fontSize: '1.0em',
                      fontWeight: 600,
                      fontFamily: 'Segoe UI Symbol, Arial Unicode MS, Noto Sans Symbols, Noto Sans, sans-serif',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Immer ein Icon anzeigen, auch wenn Status noch nicht geladen */}
                    {getStatusIcon(motor) || '◇'}
                  </span>
                </div>
              </div>

              <div className="tile-controls">
                {/* Erste Zeile: Hoch (1/2), Runter (1/2) */}
                <button
                  className="tile-btn tile-btn-up"
                  style={{ gridColumn: '1 / 4' }}
                  onClick={(e) => handleAction(motor, 'up', e)}
                  disabled={isLoading && selectedMotor?.id === motor.id}
                  title="Hoch"
                  aria-label={`${motor.displayName} hochfahren`}
                  aria-busy={isLoading && selectedMotor?.id === motor.id}
                >
                  <span className="btn-icon" aria-hidden="true">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '△'}</span>
                  <span className="btn-label">Hoch</span>
                </button>
                <button
                  className="tile-btn tile-btn-down"
                  style={{ gridColumn: '4 / 7' }}
                  onClick={(e) => handleAction(motor, 'down', e)}
                  disabled={isLoading && selectedMotor?.id === motor.id}
                  title="Runter"
                  aria-label={`${motor.displayName} runterfahren`}
                  aria-busy={isLoading && selectedMotor?.id === motor.id}
                >
                  <span className="btn-icon" aria-hidden="true">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '▽'}</span>
                  <span className="btn-label">Runter</span>
                </button>

                {/* Zweite Zeile: Öffnen (1/3), Stop (1/3), Schließen (1/3) */}
                <button
                  className="tile-btn tile-btn-lamellen-open"
                  style={{ gridColumn: '1 / 3' }}
                  onClick={(e) => handleAction(motor, 'lamellen_open', e)}
                  disabled={isLoading && selectedMotor?.id === motor.id}
                  title="Lamellen öffnen"
                  aria-label={`${motor.displayName} Lamellen öffnen`}
                  aria-busy={isLoading && selectedMotor?.id === motor.id}
                >
                  <span className="btn-icon" aria-hidden="true">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '☀️'}</span>
                  <span className="btn-label">Öffnen</span>
                </button>
                <button
                  className="tile-btn tile-btn-stop"
                  style={{ gridColumn: '3 / 5' }}
                  onClick={(e) => handleAction(motor, 'stop', e)}
                  disabled={isLoading && selectedMotor?.id === motor.id}
                  title="Stop"
                  aria-label={`${motor.displayName} stoppen`}
                  aria-busy={isLoading && selectedMotor?.id === motor.id}
                >
                  <span className="btn-icon" aria-hidden="true">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '□'}</span>
                  <span className="btn-label">Stop</span>
                </button>
                <button
                  className="tile-btn tile-btn-lamellen-close"
                  style={{ gridColumn: '5 / 7' }}
                  onClick={(e) => handleAction(motor, 'lamellen_close', e)}
                  disabled={isLoading && selectedMotor?.id === motor.id}
                  title="Lamellen schließen"
                  aria-label={`${motor.displayName} Lamellen schließen`}
                  aria-busy={isLoading && selectedMotor?.id === motor.id}
                >
                  <span className="btn-icon" aria-hidden="true">{isLoading && selectedMotor?.id === motor.id ? '⏳' : '🌑'}</span>
                  <span className="btn-label">Schließen</span>
                </button>

                {/* Dritte/Vierte Zeile nur für Jalousien */}
                {isJalousie && (
                  <>
                    {/* Dritte Zeile: Lamellen-Stufen Öffnen 25%, 50%, 75%, 100% */}
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '1 / 2', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'up', LAMELLEN_STUFEN_OEFFNEN.stufe1, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="25% öffnen"
                      aria-label={`${motor.displayName} Lamellen 25% öffnen`}
                    >
                      25%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '2 / 3', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'up', LAMELLEN_STUFEN_OEFFNEN.stufe2, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="50% öffnen"
                      aria-label={`${motor.displayName} Lamellen 50% öffnen`}
                    >
                      50%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '3 / 4', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'up', LAMELLEN_STUFEN_OEFFNEN.stufe3, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="75% öffnen"
                      aria-label={`${motor.displayName} Lamellen 75% öffnen`}
                    >
                      75%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '4 / 5', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'up', LAMELLEN_STUFEN_OEFFNEN.stufe4, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="100% öffnen"
                      aria-label={`${motor.displayName} Lamellen 100% öffnen`}
                    >
                      100%
                    </button>

                    {/* Vierte Zeile: Lamellen-Stufen Schließen 25%, 50%, 75%, 100% */}
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '1 / 2', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'down', LAMELLEN_STUFEN_SCHLIESSEN.stufe1, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="25% schließen"
                      aria-label={`${motor.displayName} Lamellen 25% schließen`}
                    >
                      25%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '2 / 3', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'down', LAMELLEN_STUFEN_SCHLIESSEN.stufe2, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="50% schließen"
                      aria-label={`${motor.displayName} Lamellen 50% schließen`}
                    >
                      50%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '3 / 4', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'down', LAMELLEN_STUFEN_SCHLIESSEN.stufe3, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="75% schließen"
                      aria-label={`${motor.displayName} Lamellen 75% schließen`}
                    >
                      75%
                    </button>
                    <button
                      className="tile-btn tile-btn-stufe"
                      style={{ gridColumn: '4 / 5', fontSize: '12px', padding: '6px' }}
                      onClick={(e) => handleLamellenStufe(motor, 'down', LAMELLEN_STUFEN_SCHLIESSEN.stufe4, e)}
                      disabled={isLoading && selectedMotor?.id === motor.id}
                      title="100% schließen"
                      aria-label={`${motor.displayName} Lamellen 100% schließen`}
                    >
                      100%
                    </button>
                  </>
                )}

                {/* Fünfte Zeile: Back-Button über ganze Breite */}
                <button
                  className="tile-btn tile-btn-back"
                  style={{ gridColumn: '1 / 7' }}
                  onClick={(e) => { e.stopPropagation(); handleBack(); }}
                  title="Zurück zur Raumübersicht"
                  aria-label="Zurück zur Raumübersicht"
                >
                  <span className="btn-icon" aria-hidden="true">🔙</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(MotorList)
