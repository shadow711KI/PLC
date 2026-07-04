// Motor Control API Integration
import { MotorCommand, MotorStatusQuery, MotorStatusResponse } from '../types'
import { getApiBaseUrl } from './getApiBaseUrl'

const API_BASE_URL = getApiBaseUrl()

/**
 * Sendet einen Motor-Befehl an die SPS
 */
export async function sendMotorCommand(command: MotorCommand): Promise<{ success: boolean; message: string; motorStatus?: Record<string, string> }> {
  console.log('[sendMotorCommand] API call:', command);
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
