import { Motor, MotorTimesConfig, ZeitautomatikPoint } from '../../types'

// ============================================================================
// SHARED CONSTANTS
// ============================================================================

// SPS Station Information
export const spsInfo: Record<string, { host: string; port: number }> = {
  SPS1: { host: '192.168.178.234', port: 1001 },
  SPS2: { host: '192.168.178.234', port: 1002 },
  SPS3: { host: '192.168.178.235', port: 1003 },
}

// Mapping: Technischer Name → Motornummer (synchron mit Backend)
export const motorNumberMapping: Record<string, Record<string, number>> = {
  SPS1: {
    'Wohnen_Ost': 1,
    'Wohnen_Sued_links': 2,
    'Wohnen_Sued_rechts': 3,
    'Wohnen_West_links': 4,
    'Wohnen_West_rechts': 5,
    'Arbeiten': 6,
  },
  SPS2: {
    'Schlafen_Sued': 1,
    'Anna_Sued': 2,
    'Anna_West': 3,
    'Fitnessraum': 4,
    'Frida': 5,
    'Treppe': 6,
  },
  SPS3: {
    'Bad': 2,
    'Schlafen_Ankleide': 3,
    'Schlafen_Osten': 4,
  }
}

// ============================================================================
// SHARED API FUNCTIONS
// ============================================================================

// API-Aufruf: Zeitpunkte eines Motors auslesen
export async function fetchTimeAutomationPoints(motor: Motor): Promise<ZeitautomatikPoint[]> {
  const res = await fetch(`/api/zeitautomatik?motor=${encodeURIComponent(motor.technicalName)}`);
  if (res.ok) {
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  }
  return [];
}

// API-Aufruf: Motorlaufzeiten/Antippzeiten lesen
export async function fetchMotorTimes(motor: Motor) {
  const res = await fetch(`/api/motor/times?motor=${encodeURIComponent(motor.technicalName)}`);
  if (res.ok) {
    const data = await res.json();
    if (data.success) return data.data;
  }
  return null;
}

// API-Aufruf: Motorlaufzeiten/Antippzeiten schreiben
export async function saveMotorTimesApi(motor: Motor, payload: MotorTimesConfig) {
  const res = await fetch('/api/motor/times', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motor: motor.technicalName, ...payload })
  });
  if (res.ok) {
    const data = await res.json();
    return data.success ? (data.data ?? {}) : null; // akzeptiere Erfolg auch ohne Rücklese-Daten
  }
  return null;
}

// API-Aufruf: Zeitpunkte eines Motors speichern
export async function saveTimeAutomationPoints(motor: Motor, points: ZeitautomatikPoint[]): Promise<boolean> {
  const res = await fetch('/api/zeitautomatik', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motor: motor.technicalName, points })
  });
  return res.ok;
}
