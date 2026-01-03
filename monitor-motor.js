// monitor-motor.js
// Überwacht kontinuierlich die Motorpositionen von Motor 6 (Arbeiten)
// Zeigt Änderungen an wenn der Schalter gedrückt wird

import net from 'node:net';
import fs from 'node:fs';

// Konfiguration laden
const map = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const STATION_KEY = process.env.STATION || 'SPS1';
const cfg = map[STATION_KEY];
if (!cfg) throw new Error(`Station ${STATION_KEY} nicht gefunden`);

const CSE_HOST = cfg.host;
const CSE_PORT = cfg.port;
const STATION = cfg.station ?? 0;

console.log(`Überwache Motor-Positionen auf ${STATION_KEY} ${CSE_HOST}:${CSE_PORT}`);
console.log('Drücke den Schalter und schau die Positions-Änderungen...\n');

// ===== Protokoll-Hilfen =====
function checksumLE(frameNoCksum) {
  const etxIdx = frameNoCksum.indexOf(0x03);
  if (etxIdx < 0) throw new Error('ETX (0x03) nicht gefunden');
  const start = 2;
  let sum = 0;
  for (let i = start; i < etxIdx; i++) sum = (sum + frameNoCksum[i]) & 0xFFFF;
  return [sum & 0xFF, (sum >> 8) & 0xFF];
}

function buildFrame({ station = STATION, operands }) {
  const STX = 0x02, ETX = 0x03, TYP_AB = 0x41;
  
  const payload = [TYP_AB, station, operands.length];
  for (const op of operands) {
    payload.push(op.code);
    if (op.addrLow === undefined || op.addrHigh === undefined) {
      throw new Error('addrLow/addrHigh fehlen');
    }
    payload.push(op.addrLow, op.addrHigh);
    if (op.status !== undefined) payload.push(op.status);
    if (op.valueLow !== undefined && op.valueHigh !== undefined) {
      payload.push(op.valueLow, op.valueHigh);
    }
  }
  
  const len = payload.length + 1;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  const [ckL, ckH] = checksumLE(frameNoCksum);
  return [...frameNoCksum, ckL, ckH];
}

// Frame zum Auslesen von Motor 6 Position
function frameReadMotor6Position() {
  // Lese nur Motor 6 Position: Adresse 0x24
  const operands = [
    { code: 0x48, addrLow: 0x24, addrHigh: 0x00 },  // Motor 6 Position
  ];
  return buildFrame({ operands });
}

// Interpretiere Motor-Position
function interpretPosition(value) {
  if (value === 0x00) return 'Oben (100%)';
  if (value === 0x01) return 'Unten (0%)';
  if (value >= 0x02 && value <= 0x7F) return `Position ${value}`;
  return `Status: ${value.toString(16)}`;
}

let lastPositions = {};
let isConnected = false;

// TCP-Verbindung
const sock = net.createConnection({ host: CSE_HOST, port: CSE_PORT }, () => {
  console.log(`✓ Verbunden zu ${CSE_HOST}:${CSE_PORT}\n`);
  isConnected = true;
  
  // Starte Abfrage alle 500ms
  const pollInterval = setInterval(() => {
    if (isConnected) {
      const frame = frameReadMotor6Position();
      sock.write(Buffer.from(frame));
    }
  }, 500);
  
  sock.on('close', () => {
    clearInterval(pollInterval);
  });
});

// Response verarbeiten
sock.on('data', (buf) => {
  const hex = buf.toString('hex');
  console.log(`RX: ${hex}`);
  
  // Parse Response: 02 03 41 [values...] 03 [checksum]
  if (buf[0] === 0x02 && buf[2] === 0x41) {
    // Motor 6 Wert sollte bei Position 4 sein
    const motor6Value = buf[4];
    
    if (motor6Value !== undefined) {
      const time = new Date().toLocaleTimeString('de-DE');
      console.log(`[${time}] Motor 6 (Arbeiten): ${interpretPosition(motor6Value)} (0x${motor6Value.toString(16).toUpperCase()})\n`);
    }
  }
});

sock.on('error', (e) => {
  console.error('❌ Fehler:', e.message);
  isConnected = false;
});

sock.on('close', () => {
  console.log('\nVerbindung geschlossen');
  isConnected = false;
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nÜberwachung beendet');
  sock.end();
  process.exit(0);
});
