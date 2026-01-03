// Motor Control API Integration

export interface MotorCommand {
  motor: string
  action: 'hoch' | 'runter' | 'stop' | 'lamellen_oeffnen' | 'lamellen_schliessen'
  sps: string
  port: number
}

export interface MotorStatusQuery {
  motorId: number
  host: string
  port: number
}

export interface MotorStatusResponse {
  status: string
  dataSize: number
  raw: string
}

// API Base URL - dynamisch basierend auf aktuellem Host
const getApiBaseUrl = () => {
  // Wenn die App über das Netzwerk geladen wird, nutze die gleiche IP für die API
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3001`
  }
  // Lokal: nutze localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

const API_BASE_URL = getApiBaseUrl()

/**
 * Sendet einen Motor-Befehl an die SPS
 */
export async function sendMotorCommand(command: MotorCommand): Promise<{ success: boolean; message: string; motorStatus?: Record<string, string> }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/motor/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Motor command failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Fragt den Status eines Motors ab
 */
export async function queryMotorStatus(query: MotorStatusQuery): Promise<MotorStatusResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/motor/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Motor status query failed:', error)
    return null
  }
}

/**
 * Prüft, ob das Backend erreichbar ist
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    })

    return response.ok
  } catch (error) {
    console.error('Backend health check failed:', error)
    return false
  }
}
