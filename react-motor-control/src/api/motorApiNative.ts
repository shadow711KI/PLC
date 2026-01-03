// Native TCP communication for iOS app (without backend server)
// This will be implemented using Capacitor plugins

export interface MotorCommand {
  motor: string
  action: 'hoch' | 'runter' | 'stop'
  sps: string
  port: number
}

export interface MotorCommandResult {
  success: boolean
  message: string
}

// Frame builders (copied from backend)
function buildFrame(motorNr: number, status: number): Uint8Array {
  const STX = 0x02, ETX = 0x03, TYP = 0x41
  const STATION = 0x00
  const opCount = 0x01
  const opcode = 0x01
  const valueLow = 0x48
  
  const statusByte = (motorNr - 1) * 0x10 + status
  
  const payload = [TYP, STATION, opCount, opcode, valueLow, statusByte, 0x00, 0x01]
  const len = payload.length
  const frameNoCksum = [STX, len, ...payload, ETX]
  
  let sum = 0
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i]
  }
  
  const ckLow = sum & 0xFF
  const ckHigh = (sum >> 8) & 0xFF
  
  return new Uint8Array([...frameNoCksum, ckLow, ckHigh])
}

function buildStopFrame(motorNr: number): Uint8Array {
  const motorIdx = motorNr - 1
  
  const b7 = (motorIdx * 0x10) + 0x0D
  const b13 = (motorIdx * 0x10) + 0x0E
  const b17 = (motorIdx * 0x10) + 0x03
  const b21 = (motorIdx * 0x10) + 0x04
  
  const payload = [
    0x41, 0x00, 0x01, 0x04,
    0x69, b7, 0x00,
    0x30, 0x75, 0x69,
    b13, 0x00,
    0x30, 0x75, 0x48,
    b17, 0x00, 0x00,
    0x48, b21, 0x00, 0x00
  ]
  
  const STX = 0x02
  const LEN = payload.length
  const ETX = 0x03
  
  const frameData = [STX, LEN, ...payload, ETX]
  
  let sum = 0
  for (let i = 2; i < frameData.length - 1; i++) {
    sum += frameData[i]
  }
  
  const ckLow = sum & 0xFF
  const ckHigh = (sum >> 8) & 0xFF
  
  return new Uint8Array([...frameData, ckLow, ckHigh])
}

// SPS mapping
const spsMapping: Record<string, { host: string; port: number; motors: Record<string, { nr: number }> }> = {
  SPS1: {
    host: '192.168.178.234',
    port: 1001,
    motors: {
      'Wohnen_Ost': { nr: 1 },
      'Wohnen_Sued_links': { nr: 2 },
      'Wohnen_Sued_rechts': { nr: 3 },
      'Wohnen_West_links': { nr: 4 },
      'Wohnen_West_rechts': { nr: 5 },
      'Arbeiten': { nr: 6 },
    }
  },
  SPS2: {
    host: '192.168.178.234',
    port: 1002,
    motors: {
      'Schlafen_Sued': { nr: 1 },
      'Anna_Sued': { nr: 2 },
      'Anna_West': { nr: 3 },
      'Fitnessraum': { nr: 4 },
      'Frida': { nr: 5 },
      'Treppe': { nr: 6 },
    }
  },
  SPS3: {
    host: '192.168.178.235',
    port: 1003,
    motors: {
      'Bad': { nr: 2 },
      'Schlafen_Ankleide': { nr: 3 },
      'Schlafen_Osten': { nr: 4 },
    }
  }
}

// Native TCP communication using Capacitor
async function sendTCPCommand(host: string, port: number, data: Uint8Array): Promise<boolean> {
  try {
    // For iOS app, we'll use a Capacitor TCP plugin
    // This is a placeholder - actual implementation depends on the plugin
    
    // Option 1: Use cordova-plugin-tcp-sockets (if available)
    // @ts-ignore
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.sockets) {
      return new Promise((resolve) => {
        // @ts-ignore
        const socket = new window.cordova.plugins.sockets.Socket()
        
        socket.open(
          host,
          port,
          () => {
            socket.write(data, () => {
              setTimeout(() => {
                socket.close()
                resolve(true)
              }, 1000)
            }, () => {
              socket.close()
              resolve(false)
            })
          },
          () => {
            resolve(false)
          }
        )
      })
    }
    
    // Fallback: Use fetch if running as PWA (requires backend)
    const response = await fetch('http://localhost:3001/api/motor/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        port,
        frame: Array.from(data)
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('TCP send error:', error)
    return false
  }
}

export async function sendMotorCommand(command: MotorCommand): Promise<MotorCommandResult> {
  try {
    // Find motor number
    let motorNr: number | null = null
    
    for (const spsData of Object.values(spsMapping)) {
      if (spsData.motors[command.motor]) {
        motorNr = spsData.motors[command.motor].nr
        break
      }
    }
    
    if (!motorNr) {
      return {
        success: false,
        message: 'Motor nicht gefunden'
      }
    }
    
    // Build frame
    let frame: Uint8Array
    if (command.action === 'stop') {
      frame = buildStopFrame(motorNr)
    } else {
      const statusCode = command.action === 'hoch' ? 0x01 : 0x02
      frame = buildFrame(motorNr, statusCode)
    }
    
    // Send command
    const success = await sendTCPCommand(command.sps, command.port, frame)
    
    return {
      success,
      message: success ? 'Befehl gesendet' : 'Verbindung fehlgeschlagen'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}
