import { useState } from 'react'
import { Motor } from '../App'
import { sendMotorCommand } from '../api/motorApi'
import './MotorControl.css'

interface MotorControlProps {
  motor: Motor
  onBack: () => void
}

// SPS Mapping
const spsMapping: Record<string, { host: string; port: number }> = {
  SPS1: { host: '192.168.178.234', port: 1001 },
  SPS2: { host: '192.168.178.234', port: 1002 },
  SPS3: { host: '192.168.178.235', port: 1003 },
}

export default function MotorControl({ motor, onBack }: MotorControlProps) {
  const [currentStatus, setCurrentStatus] = useState(motor.status)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAction = async (action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {
    const actionMap = {
      up: 'hoch',
      down: 'runter',
      stop: 'stop',
      lamellen_open: 'lamellen_oeffnen',
      lamellen_close: 'lamellen_schliessen'
    } as const

    const actionLabels = {
      up: '⬆️ HOCH',
      down: '⬇️ RUNTER',
      stop: '⏹️ STOP',
      lamellen_open: '☀️ LAMELLEN ÖFFNEN',
      lamellen_close: '🌑 LAMELLEN SCHLIEẞEN'
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Sende Befehl an Backend
      const spsInfo = spsMapping[motor.sps]
      const result = await sendMotorCommand({
        motor: motor.name,
        action: actionMap[action],
        sps: spsInfo.host,
        port: spsInfo.port,
      })

      if (result.success) {
        // Aktualisiere lokalen Status
        if (action === 'up') setCurrentStatus('Bewegt sich hoch')
        else if (action === 'down') setCurrentStatus('Bewegt sich runter')
        else setCurrentStatus('Gestoppt')

        console.log(`✓ ${motor.name}: ${actionLabels[action]} erfolgreich`)
      } else {
        setErrorMessage(`Fehler: ${result.message}`)
        console.error(`✗ ${motor.name}: ${actionLabels[action]} fehlgeschlagen`)
      }
    } catch (error) {
      setErrorMessage('Verbindung zum Server fehlgeschlagen')
      console.error('Motor control error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="motor-control-screen">
      <div className="motor-header">
        <h2>{motor.name}</h2>
        <p>Motor {motor.id} • {motor.sps} • Zeitautomatik</p>
      </div>

      {errorMessage && (
        <div className="error-message">
          ⚠️ {errorMessage}
        </div>
      )}

      <div className="status-info">
        <div className="status-item">
          <div className="status-label">Status</div>
          <div className="status-value">{currentStatus}</div>
        </div>
      </div>

      <div className="control-buttons">
        <button 
          className="btn btn-up" 
          onClick={() => handleAction('up')}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '⬆️'} HOCH
        </button>
        <button 
          className="btn btn-stop" 
          onClick={() => handleAction('stop')}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '⏹️'} STOP
        </button>
        <button 
          className="btn btn-down" 
          onClick={() => handleAction('down')}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '⬇️'} RUNTER
        </button>
      </div>

      <div className="control-buttons lamellen-buttons">
        <button 
          className="btn btn-lamellen-open" 
          onClick={() => handleAction('lamellen_open')}
          disabled={isLoading}
          title="Sequenz: RUNTER → HOCH → STOP"
        >
          {isLoading ? '⏳' : '☀️'} LAMELLEN ÖFFNEN
        </button>
        <button 
          className="btn btn-lamellen-close" 
          onClick={() => handleAction('lamellen_close')}
          disabled={isLoading}
          title="Sequenz: RUNTER → STOP"
        >
          {isLoading ? '⏳' : '🌑'} LAMELLEN SCHLIEẞEN
        </button>
      </div>

      <button className="btn btn-back" onClick={onBack}>
        ← ZURÜCK ZUM MOTOR-MENU
      </button>
    </div>
  )
}
