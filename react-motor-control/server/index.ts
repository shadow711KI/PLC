import express from 'express';
import cors from 'cors';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { MotorNr, SPSName, SPSConfig, MotorInfo, TimePoint, StatusResponse, AppConfig } from './types';
import { buildZeitautomatikWriteFrame, buildSPSStatusQueryFrame, parseSPSStatusResponse, querySPSStatus72, logSPSResponse } from './protocol';
const require = createRequire(import.meta.url);
const { getStatusWord69 } = require('../../sps-statusbyte-helper');

// ES Module: __dirname Alternative (ganz am Anfang!)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware - CORS MUSS vor allen Routen kommen!
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.178.93:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ...existing code...

// ...existing code...

// ...existing code...

// ...existing code...

// ...existing code...


// Hilfsfunktion: Zeitpunkte an SPS schreiben (TCP)
function writeZeitautomatikToSPS(host: string, port: number, motorNr: MotorNr, points: TimePoint[]): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const frame = buildZeitautomatikWriteFrame(motorNr, points);
    logTelegram('SEND', `ZeitAuto WRITE Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
    const sock = net.createConnection({ host, port });
    let response = Buffer.alloc(0);
    let timeoutHandle: NodeJS.Timeout;
    sock.on('connect', () => { sock.write(frame); });
    sock.on('data', (data) => { 
      response = Buffer.concat([response, data]);
      logTelegram('RECV', `ZeitAuto WRITE Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
      logSPSResponse(data.toString('hex'), 'Zeitautomatik WRITE');
      // Warte auf BEIDE Responses: ACK (5 bytes) + SUCCESS (5 bytes) = mindestens 10 bytes
      if (response.length >= 10) {
        clearTimeout(timeoutHandle);
        sock.destroy();
        logTelegram('RECV', `ZeitAuto WRITE Motor ${motorNr} komplett → ${host}:${port}`, response.toString('hex'));
        resolve(response);
      }
    });
    sock.on('end', () => { 
      clearTimeout(timeoutHandle); 
      sock.destroy(); 
      console.log('⚠️ Socket closed, total received:', response.length, 'bytes');
      resolve(response); 
    });
    sock.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });
    timeoutHandle = setTimeout(() => { 
      console.log('⏱️ Timeout reached, received:', response.length, 'bytes');
      sock.destroy(); 
      resolve(response.length > 0 ? response : null); 
    }, 250);
  });
}

// Hilfsfunktion: Zeitautomatik-Frame für einen Motor bauen (READ)
// Nach Doku: Für Zeitautomatik sollten Zeitpunkte gelesen werden
// Verwende Frame für Schaltzeitpunkte 1-6 lesen (aus Doku 8.5)
function buildZeitautomatikReadFrame(motorNr: MotorNr) {
  // Frame für 6 Zeitpunkte lesen: 02 16 41 00 00 06 69 07 00 ... 03 [checksum]
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const OPCODE = 0x00; // Befehlscode
  const COUNT = 0x06; // 6 Operanden (Zeitpunkte 1-6)
  // Dynamisch Adressen für Zeitpunkte berechnen
  const operands = [];
  for (let i = 0; i < 6; i++) {
    const addrHex = getStatusWord69(motorNr, `zeitschaltpunkt${i+1}`);
    const addr = parseInt(addrHex, 16);
    operands.push(0x69, addr, 0x00);
  }
  const payload = [TYP, STATION, OPCODE, COUNT, ...operands];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);
  console.log(`🔧 Zeitautomatik Read Frame für Motor ${motorNr}:`, frame.toString('hex'));
  return frame;
}

// Hilfsfunktion: Zeitpunkte von SPS lesen (TCP)
function readZeitautomatikFromSPS(host: string, port: number, motorNr: MotorNr): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const frame = buildZeitautomatikReadFrame(motorNr);
    const sock = net.createConnection({ host, port, timeout: 250 });
    let response = Buffer.alloc(0);
    let timeoutHandle: NodeJS.Timeout;
    sock.on('connect', () => { 
      logTelegram('SEND', `ZeitAuto READ Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
      sock.write(frame); 
    });
    sock.on('data', (data) => { 
      response = Buffer.concat([response, data]);
      logTelegram('RECV', `ZeitAuto READ Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
      logSPSResponse(data.toString('hex'), `ZeitAuto READ Motor ${motorNr}`);
    });
    sock.on('end', () => { 
      clearTimeout(timeoutHandle); 
      sock.destroy(); 
      logTelegram('RECV', `ZeitAuto READ Motor ${motorNr} komplett → ${host}:${port}`, response.toString('hex'));
      resolve(response); 
    });
    sock.on('error', (err) => { 
      clearTimeout(timeoutHandle); 
      resolve(null); 
    });
    timeoutHandle = setTimeout(() => { 
      sock.destroy(); 
      resolve(response.length > 0 ? response : null); 
    }, 250);
  });
}

// Hilfsfunktion: Zeitpunkte aus SPS-Response parsen (nach Doku 8.5)
function parseZeitautomatikResponse(buffer: Buffer) {
  // Robustere deutsche Version: Gibt immer alle Felder zurück, auch bei ungültigen Werten
  if (!buffer || buffer.length < 10) {
    console.log('⚠️  Keine gültige SPS-Antwort für Zeitautomatik erhalten');
    return [];
  }

  console.log('📡 SPS-Antwort für Zeitautomatik erhalten:', buffer.toString('hex'), 'Länge:', buffer.length);

  // Erwartete Antwort-Struktur für 6 Zeitpunkte (nach korrigierter Doku):
  // Response enthält 6 Zeitpunkte à 4 Bytes, danach 3 Bytes Abstand
  // Pro Zeitpunkt (4 Bytes):
  //   Byte 0 (bytes[0]): Unbekanntes Byte
  //   Byte 1 (bytes[1]): Bits für Wochentage (Sa=bit2, Fr=bit1, Do=bit0) + weitere in byte 2
  //   Byte 2 (bytes[2]): Bits für Wochentage (Mi=bit7, Di=bit6, Mo=bit5, So=bit4) + Stundenbits (h0-h3 = bits 0-3)
  //   Byte 3 (bytes[3]): Minutenbits (m0-m5 = bits 6-1), Stundenbit h4=bit7, Aktiviert=bit0

  try {
    // SPS-Antwort hat 2 Frames: ACK (5 bytes) + Daten-Frame
    // ACK: 02 03 40 00 21
    // Daten: 02 1C 41 00 00 06 [24 bytes = 6×4 bytes] 03 [checksum]
    
    // Überspringe ACK-Frame falls vorhanden
    let dataFrame = buffer;
    if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
      dataFrame = buffer.slice(5); // Überspringe ACK-Frame
    }
    
    // Finde Datenstart nach Header [02 1C 41 00 00 06]
    const dataStart = 6; // Nach STX(02), LEN(1C), TYP(41), STATION(00), ?(00), COUNT(06)
    const timePoints = [];

    // Pro Zeitpunkt: nur 4 Bytes Daten (KEIN Gap in Response!)
    // Neue Bitlogik: Big Endian, Bit 0=Aktion, Bit 1-6=Minute, Bit 7-11=Stunde, Bit 12-18=Wochentage
    for (let i = 0; i < 6; i++) {
      const offset = dataStart + (i * 4); // Nur 4 Bytes pro Zeitpunkt
      if (offset + 4 > dataFrame.length) {
        timePoints.push({
          id: i + 1,
          weekdayMask: 0,
          weekdays: [],
          hour: null,
          minute: null,
          action: 'unbekannt',
          raw: [null, null, null, null],
          info: 'Keine Daten empfangen'
        });
        continue;
      }
      
      const bytes = dataFrame.slice(offset, offset + 4);
      
      // 4 bytes als 32-Bit-Wert zusammensetzen (Big Endian)
      const value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
      
      // Bit 0: Aktion (1 = hoch, 0 = runter)
      const aktion = value & 0x1;
      
      // Bit 1-6: Minute (6 Bit)
      const minute = (value >> 1) & 0x3F;
      
      // Bit 7-11: Stunde (5 Bit)
      const stunde = (value >> 7) & 0x1F;
      
      // Bit 12-18: Wochentage (7 Bit)
      const wochentage = (value >> 12) & 0x7F;
      
      // Wochentage extrahieren (Bit 18=Sa, 17=Fr, 16=Do, 15=Mi, 14=Di, 13=Mo, 12=So)
      const sa = !!(wochentage & 0x40); // Bit 18
      const fr = !!(wochentage & 0x20); // Bit 17
      const do_ = !!(wochentage & 0x10); // Bit 16
      const mi = !!(wochentage & 0x08); // Bit 15
      const di = !!(wochentage & 0x04); // Bit 14
      const mo = !!(wochentage & 0x02); // Bit 13
      const so = !!(wochentage & 0x01); // Bit 12
      
      const weekdays = [];
      if (sa) weekdays.push('Sa');
      if (fr) weekdays.push('Fr');
      if (do_) weekdays.push('Do');
      if (mi) weekdays.push('Mi');
      if (di) weekdays.push('Di');
      if (mo) weekdays.push('Mo');
      if (so) weekdays.push('So');
      
      // Validierung
      const hour = (stunde >= 0 && stunde <= 23) ? stunde : null;
      const validMinute = (minute >= 0 && minute <= 59) ? minute : null;
      
      // Aktion: 1 = hoch, 0 = runter
      const action = aktion ? 'hoch' : 'runter';
      
      // Wochentag-Maske berechnen (für Frontend-Bearbeitung)
      const weekdayMask = (so ? 1 : 0) | (mo ? 2 : 0) | (di ? 4 : 0) | (mi ? 8 : 0) | (do_ ? 16 : 0) | (fr ? 32 : 0) | (sa ? 64 : 0);
      
      // Info-Feld für Debugging
      let info = '';
      if (hour === null) info += 'Stunde ungültig; ';
      if (validMinute === null) info += 'Minute ungültig; ';
      
      timePoints.push({
        id: i + 1,
        weekdays,
        weekdayMask,
        hour,
        minute: validMinute,
        action,
        raw: Array.from(bytes),
        info: info.trim()
      });
    }

    console.log('📅 Parsierte Zeitpunkte:', timePoints);
    return timePoints;
  } catch (error) {
    console.error('❌ Fehler beim Parsen der Zeitautomatik-Antwort:', error);
    // Im Fehlerfall: 6 leere Zeitpunkte zurückgeben
    return Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      weekdayMask: 0,
      weekdays: [],
      hour: null,
      minute: null,
      action: 'unbekannt',
      raw: [null, null, null, null],
      info: 'Parser-Fehler'
    }));
  }
}

// ────────────────────────────────────────────────────────────
// Motor-Laufzeiten / Wendezeit / Antippzeiten (Opcode 0x69, Word)
// Basierend auf App-Telegrammen (#93-#97) und Zuordnung in sps-statusbyte-helper
function buildMotorTimesReadFrame(motorNr: number): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const payload = [TYP, 0x00, 0x00, 0x05]; // station=0, opcode=read(0x00), count=5 words
  const fields = ['laufzeit_hoch', 'laufzeit_runter', 'antipzeit_hoch', 'antipzeit_runter', 'wendzeit'];
  for (const field of fields) {
    const addrHex = getStatusWord69(motorNr, field);
    const addr = parseInt(addrHex, 16);
    payload.push(0x69, addr, 0x00);
  }
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function parseMotorTimesResponse(buffer: Buffer) {
  // Erwartet: optional 5-byte ACK (02 03 40 00 21) + Datenframe
  if (!buffer || buffer.length < 12) return null;

  let dataFrame = buffer;
  if (buffer[0] === 0x02 && buffer[1] === 0x03) {
    dataFrame = buffer.slice(5);
  }

  // Datenframe: 02 [LEN] 41 00 00 05 <v1low v1high> ... <v5low v5high> 03 [ck]
  if (dataFrame.length < 6 + (5 * 2) + 3) return null;
  const count = dataFrame[5];
  if (count < 5) return null;

  const values: number[] = [];
  let offset = 6;
  for (let i = 0; i < 5; i++) {
    const low = dataFrame[offset];
    const high = dataFrame[offset + 1];
    // SPS speichert Zeiten in Zehntelsekunden (0.1s) - konvertiere zu Millisekunden
    const valueInTenthSeconds = (high << 8) | low;
    const valueInMilliseconds = valueInTenthSeconds * 100;
    values.push(valueInMilliseconds);
    offset += 2;
  }

  const [laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit] = values;
  return { laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit };
}

function readMotorTimes(host: string, port: number, motorNr: number): Promise<any | null> {
  return new Promise((resolve) => {
    const frame = buildMotorTimesReadFrame(motorNr);
    logTelegram('SEND', `MotorTimes READ Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
    const socket = net.createConnection({ host, port });
    let response = Buffer.alloc(0);
    let timeoutHandle: NodeJS.Timeout;

    socket.on('connect', () => socket.write(frame));
    socket.on('data', (data) => {
      response = Buffer.concat([response, data]);
      logTelegram('RECV', `MotorTimes READ Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
      logSPSResponse(data.toString('hex'), `MotorTimes READ Motor ${motorNr}`);
    });
    socket.on('end', () => {
      clearTimeout(timeoutHandle);
      socket.destroy();
      logTelegram('RECV', `MotorTimes READ Motor ${motorNr} komplett`, response.toString('hex'));
      resolve(parseMotorTimesResponse(response));
    });
    socket.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });

    timeoutHandle = setTimeout(() => { socket.destroy(); resolve(parseMotorTimesResponse(response)); }, 250);
  });
}

function buildMotorTimesWriteFrame(motorNr: number, values: { laufzeitHoch: number; laufzeitRunter: number; antipzeitHoch: number; antipzeitRunter: number; wendezeit: number; }): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const payload = [TYP, 0x00, 0x01, 0x05]; // station=0, opcode=write(0x01), count=5
  const order: Array<[keyof typeof values, string]> = [
    ['laufzeitHoch', 'laufzeit_hoch'],
    ['laufzeitRunter', 'laufzeit_runter'],
    ['antipzeitHoch', 'antipzeit_hoch'],
    ['antipzeitRunter', 'antipzeit_runter'],
    ['wendezeit', 'wendzeit']
  ];

  for (const [field, mapKey] of order) {
    const addrHex = getStatusWord69(motorNr, mapKey);
    const addr = parseInt(addrHex, 16);
    const val = Math.max(0, Math.min(0xFFFF, values[field] ?? 0));
    const low = val & 0xFF;
    const high = (val >> 8) & 0xFF;
    payload.push(0x69, addr, 0x00, low, high);
  }

  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function writeMotorTimes(host: string, port: number, motorNr: number, values: { laufzeitHoch: number; laufzeitRunter: number; antipzeitHoch: number; antipzeitRunter: number; wendezeit: number; }) {
  return new Promise<boolean>((resolve) => {
    const frame = buildMotorTimesWriteFrame(motorNr, values);
    logTelegram('SEND', `MotorTimes WRITE Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
    const socket = net.createConnection({ host, port });
    let responseReceived = false;
    let timeoutHandle: NodeJS.Timeout;

    socket.on('connect', () => socket.write(frame));
    socket.on('data', (data) => {
      responseReceived = true;
      logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
      logSPSResponse(data.toString('hex'), `MotorTimes WRITE Motor ${motorNr}`);
    });
    socket.on('error', () => { clearTimeout(timeoutHandle); resolve(false); });
    socket.on('close', () => {
      clearTimeout(timeoutHandle);
      logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} socket closed`, responseReceived ? 'response=yes' : 'response=no');
      resolve(responseReceived);
    });

    timeoutHandle = setTimeout(() => { socket.destroy(); resolve(responseReceived); }, 250);
  });
}
// Zeitautomatik Speicherpfad

// Export für Testskripte
export { parseZeitautomatikResponse };
const zeitautomatikPath = path.join(__dirname, 'zeitautomatik-store.json');
let zeitautomatikData: { motors: Record<string, TimePoint[]> } = { motors: {} };
try {
  if (fs.existsSync(zeitautomatikPath)) {
    zeitautomatikData = JSON.parse(fs.readFileSync(zeitautomatikPath, 'utf-8'));
  }
} catch (error) {
  console.error('❌ Fehler beim Laden der Zeitautomatik-Daten:', error);
}

// API: Zeitautomatik auslesen (alle Motoren oder einen)
// API: Zeitautomatik auslesen (direkt von SPS)
app.get('/api/zeitautomatik', async (req, res) => {
  const motor = req.query.motor as string | undefined;
  console.log(`🔍 Zeitautomatik-API aufgerufen für Motor: ${motor}`);
  if (!motor) return res.status(400).json({ success: false, message: 'motor erforderlich' });
  // Motor in Config suchen
  const motorObj = motorConfig.motors.find((m) => m.name === motor || m.technicalName === motor);
  console.log(`🔍 Motor gefunden:`, motorObj ? { name: motorObj.name, technicalName: motorObj.technicalName, sps: motorObj.sps } : 'NICHT GEFUNDEN');
  if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
  // SPS-Info holen
  const PORT = 3001;
  const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
  console.log(`🔍 SPS gefunden:`, sps ? { host: sps.host, port: sps.port } : 'NICHT GEFUNDEN');
  if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  let motorNr: number | undefined = undefined;
  if (sps && motorObj.name && motorObj.technicalName) {
    motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
  }
  console.log(`🔍 Motor-Nr gefunden: ${motorNr} (für ${motorObj.name || motorObj.technicalName})`);
  if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
  // TCP-Request an SPS
  try {
    const spsResponse = await readZeitautomatikFromSPS(sps.host, sps.port, motorNr as MotorNr);
    console.log('--- SPS Zeitautomatik-Response ---');
    if (spsResponse && Buffer.isBuffer(spsResponse)) {
      console.log('HEX:', spsResponse.toString('hex'));
      console.log('Länge:', spsResponse.length);
    } else {
      console.log('Keine Antwort von SPS erhalten.');
    }
    const points = parseZeitautomatikResponse((spsResponse && Buffer.isBuffer(spsResponse)) ? spsResponse : Buffer.alloc(0));
    console.log('✅ Sende Zeitpunkte an Frontend:', points.length, 'Zeitpunkte');
    return res.json({ success: true, data: points });
  } catch (e) {
    console.error('❌ Fehler bei Zeitautomatik-Request:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request', error: String(e) });
  }
});

// API: SPS Status abfragen (72-Byte Telegramm)
app.get('/api/sps/status/:spsName', async (req, res) => {
  console.log('📊 GET /api/sps/status/:spsName aufgerufen');
  const { spsName } = req.params;
  const sps = spsMapping[spsName];
  if (!sps) {
    return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  }
  try {
    const statusData = await querySPSStatus72(sps.host, sps.port, spsMapping);
    // Mappe Nummern auf technische Namen, auch wenn statusData null/leer ist
    const mappedStatus: Record<string, any> = {};
    for (const [motorName, motorInfo] of Object.entries(sps.motors)) {
      const nr = motorInfo.nr;
      if (statusData && statusData[nr]) {
        mappedStatus[motorName] = { status: statusData[nr].status };
      } else {
        mappedStatus[motorName] = { status: 'unbekannt' };
      }
    }
    console.log('✅ Status-Daten für', spsName, ':', mappedStatus);
    return res.json({ success: true, data: mappedStatus });
  } catch (e) {
    console.error('❌ Fehler bei Status-Query:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Query' });
  }
});

// API: Zeitautomatik Ein/Aus schalten
app.post('/api/zeitautomatik/enable', async (req, res) => {
  console.log('🔄 POST /api/zeitautomatik/enable aufgerufen');
  const { motor, enabled } = req.body;
  console.log('🪝 Request payload:', req.body);
  console.log('🪝 motorConfig.motors displayNames:', motorConfig.motors.map(m => m.displayName));
  console.log('🪝 motorConfig.motors technicalNames:', motorConfig.motors.map(m => m.technicalName));
  // Show both for clarity
  console.log('🪝 motorConfig.motors (displayName/technicalName):', motorConfig.motors.map(m => `${m.displayName} / ${m.technicalName}`));

  if (!motor || enabled === undefined) {
    console.log('❌ Fehler: motor oder enabled fehlt', { motor, enabled });
    return res.status(400).json({ success: false, message: 'motor und enabled erforderlich' });
  }

  // Motor in Config suchen
  // m.name does not exist, use displayName for logging
  const motorObj = motorConfig.motors.find((m) => m.displayName === motor || m.technicalName === motor);
  console.log('🪝 motorObj:', motorObj);
  if (!motorObj) {
    console.log('❌ Motor nicht gefunden:', motor);
    return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
  }

  // SPS-Info holen
  const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
  if (!sps) {
    console.log('❌ SPS nicht gefunden:', motorObj.sps);
    return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  }

  const motorNr = sps.motors[motorObj.technicalName]?.nr;
  console.log('🪝 motorNr:', motorNr);
  if (!motorNr) {
    console.log('❌ Motor-Nr nicht gefunden für:', motorObj.displayName, motorObj.technicalName);
    return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
  }

  // Frame bauen: 02 09 41 00 01 01 69 [ADDR] 00 [VALUE] 00 03 [CK]
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  // Use sps-statusbyte-helper for Automatik address calculation
  const addrHex = getStatusWord69(motorNr, 'autom_ein_aus');
  const addr = parseInt(addrHex, 16);
  // PROTOCOL LOGIC: 0x00 = AN (enabled), 0x01 = AUS (disabled)
  const value = enabled ? 0x00 : 0x01; // 0x00=AN, 0x01=AUS

  const payload = [TYP, 0x00, 0x01, 0x01, 0x69, addr, 0x00, value, 0x00];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];

  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;

  const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);

  console.log(`📤 Sende Automatik ${enabled ? 'AN' : 'AUS'} für Motor ${motorNr} (${motorObj.displayName}/${motorObj.technicalName}):`, frame.toString('hex'));

  // Frame an SPS senden
  try {
    const success = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: sps.host, port: sps.port });
      let responseReceived = false;
      let timeoutHandle: NodeJS.Timeout;

      socket.on('connect', () => socket.write(frame));
      socket.on('data', (data) => {
        responseReceived = true;
        logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} chunk → ${sps.host}:${sps.port}`, data.toString('hex'));
        logSPSResponse(data.toString('hex'), `MotorTimes WRITE Motor ${motorNr}`);
      });
      socket.on('error', () => { clearTimeout(timeoutHandle); resolve(false); });
      socket.on('close', () => {
        clearTimeout(timeoutHandle);
        logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} socket closed`, responseReceived ? 'response=yes' : 'response=no');
        resolve(responseReceived);
      });

      timeoutHandle = setTimeout(() => { socket.destroy(); resolve(responseReceived); }, 250);
    });

    const motorName = motorObj.displayName || motorObj.technicalName || 'Unbekannt';
    if (success) {
      console.log(`✅ Automatik ${enabled ? 'AN' : 'AUS'} erfolgreich für ${motorName}`);
      return res.json({ success: true, enabled, motor: motorName });
    } else {
      console.log(`❌ Keine Antwort von SPS für ${motorName}`);
      return res.json({ success: false, message: 'Keine Antwort von SPS', motor: motorName });
    }
  } catch (e) {
    console.error('❌ Fehler bei SPS-Request:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
  }
});

// API: Zeitautomatik speichern (ein Motor)
// API: Zeitautomatik speichern (direkt an SPS)
app.post('/api/zeitautomatik', async (req, res) => {
  console.log('📝 POST /api/zeitautomatik aufgerufen');
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  const { motor, points } = req.body;
  if (!motor || !Array.isArray(points)) {
    console.log('❌ Fehler: motor oder points fehlen');
    return res.status(400).json({ success: false, message: 'motor und points erforderlich' });
  }
  // Motor in Config suchen
  const motorObj = motorConfig.motors.find((m) => m.name === motor || m.technicalName === motor);
  if (!motorObj) {
    console.log('❌ Motor nicht gefunden:', motor);
    return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
  }
  console.log('✓ Motor gefunden:', motorObj.name);
  // SPS-Info holen
  const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
  if (!sps) {
    console.log('❌ SPS nicht gefunden:', motorObj.sps);
    return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  }
  let motorNr: number | undefined = undefined;
  if (sps && motorObj.name && motorObj.technicalName) {
    motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
  }
  if (!motorNr) {
    console.log('❌ Motor-Nr nicht gefunden');
    return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
  }
  console.log('✓ Motor-Nr:', motorNr, 'SPS:', sps.host, sps.port);
  // TCP-Request an SPS
  try {
    console.log('📡 Sende Zeitautomatik-Daten an SPS...');
    const spsResponse = await writeZeitautomatikToSPS(sps.host, sps.port, motorNr as MotorNr, points);
    if (spsResponse && Buffer.isBuffer(spsResponse)) {
      console.log('✓ SPS-Antwort erhalten:', spsResponse.toString('hex'));
    } else {
      console.log('✓ SPS-Antwort erhalten: (keine Daten)');
    }
    
    // KRITISCH: Nach WRITE 2-3 Sekunden warten, damit SPS Daten committen kann
    console.log('⏳ Warte 2 Sekunden, damit SPS Daten speichert...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Optional: Response prüfen/parsen
    // Nach erfolgreichem Schreiben auch im Backend-Store sichern
    zeitautomatikData.motors[motor] = points;
    fs.writeFileSync(zeitautomatikPath, JSON.stringify(zeitautomatikData, null, 2), 'utf-8');
    console.log('✓ Zeitautomatik gespeichert für Motor:', motor);
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ Fehler bei SPS-Request:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
  }
});

// Lade Motor-Konfiguration
const motorConfigPath = path.join(__dirname, '..', 'motor-config.json');
let motorConfig: { motors: MotorInfo[] };
try {
  const configData = fs.readFileSync(motorConfigPath, 'utf-8');
  motorConfig = JSON.parse(configData);
  console.log(`📄 Motor-Konfiguration geladen: ${motorConfig.motors.length} Motoren`);
} catch (error) {
  console.error('❌ Fehler beim Laden der Motor-Konfiguration:', error);
  motorConfig = { motors: [] };
}

// Lade Raum-Icons Konfiguration
const roomConfigPath = path.join(__dirname, '..', 'room-config.json');
let roomConfig: { rooms: Record<string, { icon: string }>, order?: string[] };
try {
  const configData = fs.readFileSync(roomConfigPath, 'utf-8');
  roomConfig = JSON.parse(configData);
  if (!roomConfig.order) roomConfig.order = [];
  console.log(`📄 Raum-Konfiguration geladen: ${Object.keys(roomConfig.rooms).length} Räume`);
} catch (error) {
  console.log('📄 Erstelle neue Raum-Konfiguration');
  roomConfig = { rooms: {}, order: [] };
  fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
}

// Lade Gruppen-Konfiguration
const groupsConfigPath = path.join(__dirname, '..', 'groups-config.json');
let groupsConfig: { groups: Record<string, string[]>, order?: string[] };
try {
  const configData = fs.readFileSync(groupsConfigPath, 'utf-8');
  groupsConfig = JSON.parse(configData);
  if (!groupsConfig.order) groupsConfig.order = [];
  console.log(`📄 Gruppen-Konfiguration geladen: ${Object.keys(groupsConfig.groups).length} Gruppen`);
} catch (error) {
  console.log('📄 Erstelle neue Gruppen-Konfiguration');
  groupsConfig = { groups: {}, order: [] };
  fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
}

// Globaler Status-Store für alle Motoren (synchronisiert zwischen allen Clients)
const motorStatus: Record<string, string> = {};
// Initialisiere Status für alle Motoren aus Config
motorConfig.motors.forEach((motor: any) => {
  motorStatus[motor.technicalName] = '△';
});

// SPS Adressen mapping (aus addresses.json)
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
};

// Frame-Builder Funktionen (aus motor-control.js)
function buildFrame(motorNr: number, status: number): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  // status: 0x01=hoch, 0x02=runter, 0x03=stop
  let addr;
  if (status === 0x01) {
    addr = parseInt(require('../../sps-statusbyte-helper').getStatusByte48(motorNr, 'hoch'), 16);
  } else if (status === 0x02) {
    addr = parseInt(require('../../sps-statusbyte-helper').getStatusByte48(motorNr, 'runter'), 16);
  } else if (status === 0x03) {
    addr = parseInt(require('../../sps-statusbyte-helper').getStatusByte48(motorNr, 'position_oben'), 16); // STOP mapped to position_oben for compatibility
  } else {
    throw new Error('Ungültiger Status für buildFrame');
  }
  const payload = [TYP, STATION, opCount, opcode, valueLow, addr, 0x00, 0x01];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function buildStopFrame(motorNr: number): Buffer {
  const { getStatusWord69, getStatusByte48 } = require('../../sps-statusbyte-helper');
  // STOP-Adressen aus Word-Mapping holen
  const addrStop = parseInt(getStatusWord69(motorNr, 'motor_stop'), 16);
  const addrStop2 = parseInt(getStatusWord69(motorNr, 'motor_stop2'), 16);
  // Position oben/unten weiterhin aus Byte-Mapping
  const addrOben = parseInt(getStatusByte48(motorNr, 'position_oben'), 16);
  const addrUnten = parseInt(getStatusByte48(motorNr, 'position_unten'), 16);
  const payload = [
    0x41, 0x00, 0x01, 0x04,
    0x69, addrStop, 0x00,
    0x30, 0x75, 0x69,
    addrStop2, 0x00,
    0x30, 0x75, 0x48,
    addrOben, 0x00, 0x00,
    0x48, addrUnten, 0x00, 0x00
  ];
  const STX = 0x02;
  const LEN = payload.length;
  const ETX = 0x03;
  const frameData = [STX, LEN, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameData.length - 1; i++) {
    sum += frameData[i];
  }
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameData, ckLow, ckHigh]);
}

// Status Query Frame (aus motor-control-interactive.js)
// Cache für SPS Status-Daten
const spsCache: Record<string, { timestamp: number; data: Buffer | null }> = {};
const CACHE_DURATION = 500; // 500ms Cache

// Query komplette SPS-Station (alle Motoren) - DEAKTIVIERT
function querySPSStatus(host: string, port: number): Promise<Buffer | null> {
  // Status-Abfragen deaktiviert - Status wird nur über Button-Klicks im Frontend verwaltet
  return Promise.resolve(null);
}

// Extrahiere Motor-Status aus SPS-Response
function extractMotorStatus(motorNr: number, spsResponse: Buffer | null): { status: string; position: string; raw: string } | null {
  if (!spsResponse || spsResponse.length < 30) {
    return null;
  }
  
  // Das 2. Paket (Daten) beginnt nach dem ACK
  // ACK ist typisch 5-6 bytes: 0203400021 oder 020440001501
  let dataPacketOffset = 5;
  if (spsResponse[5] === 0x04 && spsResponse.length > 40) {
    dataPacketOffset = 6; // 6-byte ACK
  }
  
  const dataPacket = spsResponse.slice(dataPacketOffset);
  
  // Header: 02 [LEN] 41 00 00 [COUNT]
  // Daten ab Byte 6
  const motorIndex = (motorNr - 1) * 2;
  const positionByteHigh = dataPacket[6 + motorIndex];
  const positionByteLow = dataPacket[7 + motorIndex];
  
  // Position dekodieren (beide Bytes einzeln prüfen wie in motor-control-interactive.js)
  let position = 'Unbekannt';
  if (positionByteHigh === 0x00 && positionByteLow === 0x00) {
    position = 'Oben';
  } else if (positionByteHigh === 0x00 && positionByteLow === 0x01) {
    position = 'Unten';
  } else if (positionByteHigh === 0x01 && positionByteLow === 0x00) {
    position = 'Oben';
  } else {
    position = `Position 0x${positionByteHigh.toString(16).toUpperCase()}${positionByteLow.toString(16).toUpperCase()}`;
  }
  
  return { 
    status: 'OK', 
    position, 
    raw: spsResponse.toString('hex') 
  };
}

// Query einzelner Motor (nutzt SPS-Cache)
function queryMotorStatus(motorNr: number, host: string, port: number): Promise<{ status: string; position: string; raw: string } | null> {
  return querySPSStatus(host, port).then(spsResponse => {
    return extractMotorStatus(motorNr, spsResponse);
  });
}

// Hilfsfunktion: Einzelnen Frame senden
function sendFrame(frame: Buffer, host: string, port: number, label?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let responseReceived = false;

    socket.on('connect', () => {
      const tag = label ? `${label} → ${host}:${port}` : `SPS ${host}:${port}`;
      logTelegram('SEND', tag, frame.toString('hex'));
      socket.write(frame);
      setTimeout(() => socket.destroy(), 500); // Erhöht von 250ms auf 500ms für zuverlässige SPS-Antworten
    });

    socket.on('data', (data) => {
      responseReceived = true;
      const tag = label ? `${label} → ${host}:${port}` : `SPS ${host}:${port}`;
      logTelegram('RECV', tag, data.toString('hex'));
    });

    socket.on('error', (err) => {
      console.error('SPS connection error:', err.message);
      resolve(false);
    });

    socket.on('close', () => {
      resolve(responseReceived);
    });
  });
}

// Sende Befehl an SPS
function sendCommandToSPS(host: string, port: number, frame: Buffer, label?: string): Promise<boolean> {
  return sendFrame(frame, host, port, label);
}

// Hilfsfunktion: Antipp-Frame für Lamellen-Steuerung (nutzt SPS Antippzeit-Register)
// WICHTIG: Das ist die RICHTIGE Methode für Teilbewegungen - nicht HOCH→STOP!
function buildAntippFrame(motorNr: number, direction: 'up' | 'down'): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  
  // Antipp-Status-Bytes: 0x03 = hoch antippen, 0x04 = runter antippen
  const statusByte = (motorNr - 1) * 0x10 + (direction === 'up' ? 0x03 : 0x04);
  
  const payload = [TYP, STATION, opCount, opcode, valueLow, statusByte, 0x00, 0x01];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// API Routes
app.post('/api/motor/control', async (req, res) => {
  try {
    const { motor, action, sps: spsHost, port } = req.body;
    
    console.log(`Received command: ${motor} - ${action}`);
    
    // Aktualisiere Status im globalen Store
    const statusIcons: Record<string, string> = {
      'hoch': '△',
      'runter': '▽',
      'stop': '□',
      'lamellen_oeffnen': '☀️',
      'lamellen_schliessen': '🌑'
    };
    if (statusIcons[action]) {
      motorStatus[motor] = statusIcons[action];
      console.log(`📊 Status aktualisiert: ${motor} → ${statusIcons[action]}`);
    }
    
    // Finde SPS und Motor
    let foundSPS: string | null = null;
    let motorNr: number | null = null;
    
    for (const [spsName, spsData] of Object.entries(spsMapping)) {
      if (spsData.motors[motor]) {
        foundSPS = spsName;
        motorNr = spsData.motors[motor].nr;
        break;
      }
    }
    
    if (!foundSPS || motorNr === null) {
      return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    }
    
    const spsData = spsMapping[foundSPS];
    
    // LAMELLEN ÖFFNEN: Sequenz HOCH → STOP (Sofort)
    if (action === 'lamellen_oeffnen') {
      console.log(`🔄 ${motor}: Lamellen öffnen - Sequenz HOCH → STOP`);
      
      // 1. HOCH
      const frameHoch = buildFrame(motorNr, 0x01);
      const resp1 = await sendFrame(frameHoch, spsData.host, spsData.port, `Motor ${motor}`);
      if (!resp1) {
        return res.json({ success: false, message: 'Keine Antwort bei HOCH' });
      }
      
      // 2. STOP
      const frameStop = buildStopFrame(motorNr);
      await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor}`);
      
      console.log(`✓ ${motor}: Lamellen geöffnet`);
      return res.json({ success: true, message: 'Lamellen geöffnet' });
    }
    
    // LAMELLEN SCHLIEẞEN: Sequenz RUNTER → STOP (Sofort)
    if (action === 'lamellen_schliessen') {
      console.log(`🔄 ${motor}: Lamellen schließen - Sequenz RUNTER → STOP`);
      
      // 1. RUNTER
      const frameRunter = buildFrame(motorNr, 0x02);
      const resp1 = await sendFrame(frameRunter, spsData.host, spsData.port, `Motor ${motor}`);
      if (!resp1) {
        return res.json({ success: false, message: 'Keine Antwort bei RUNTER' });
      }
      
      // 2. STOP
      const frameStop = buildStopFrame(motorNr);
      await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor}`);
      
      console.log(`✓ ${motor}: Lamellen geschlossen`);
      return res.json({ success: true, message: 'Lamellen geschlossen' });
    }
    
    // Normale Befehle: HOCH, RUNTER, STOP
    let frame: Buffer;
    if (action === 'hoch') {
      frame = buildFrame(motorNr, 0x01);
    } else if (action === 'runter') {
      frame = buildFrame(motorNr, 0x02);
    } else if (action === 'stop') {
      frame = buildStopFrame(motorNr);
    } else {
      return res.status(400).json({ success: false, message: 'Ungültige Aktion' });
    }
    
    // Sende an SPS
    const success = await sendCommandToSPS(spsData.host, spsData.port, frame, `Motor ${motor}`);
    
    if (success) {
      console.log(`✓ ${motor}: ${action} erfolgreich`);
      res.json({ success: true, message: 'Befehl erfolgreich gesendet', motorStatus });
    } else {
      console.log(`✗ ${motor}: ${action} fehlgeschlagen`);
      res.json({ success: false, message: 'Keine Antwort von SPS' });
    }
    
  } catch (error) {
    console.error('Error processing motor command:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// API: Stufenweises Lamellen-Öffnen/Schließen (mit Prozent)
app.post('/api/motor/lamellen-stufe', async (req, res) => {
  try {
    const { motor, direction, ms } = req.body; // direction: 'up' oder 'down', ms: direkte Wartezeit in Millisekunden
    
    if (!motor || !direction || ms === undefined) {
      return res.status(400).json({ success: false, message: 'motor, direction und ms erforderlich' });
    }
    
    console.log(`🔄 Lamellen-Stufe: ${motor} ${direction} ${ms}ms`);
    
    // Finde SPS und Motor (mit technischem Namen)
    let foundSPS: string | null = null;
    let motorNr: number | null = null;
    
    for (const [spsName, spsData] of Object.entries(spsMapping)) {
      if (spsData.motors[motor]) {
        foundSPS = spsName;
        motorNr = spsData.motors[motor].nr;
        break;
      }
    }
    
    if (!foundSPS || motorNr === null) {
      console.error(`❌ Motor nicht gefunden: ${motor}`);
      return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    }
    
    const spsData = spsMapping[foundSPS];
    console.log(`✓ Motor gefunden: ${motor} → SPS: ${foundSPS}, Motor-Nr: ${motorNr}`);
    
    const wartezeit = Math.round(ms);
    console.log(`⏱️ Wartezeit: ${wartezeit}ms`);
    
    // 1. Sende HOCH oder RUNTER
    const frame = direction === 'up' ? buildFrame(motorNr, 0x01) : buildFrame(motorNr, 0x02);
    const resp1 = await sendFrame(frame, spsData.host, spsData.port, `Motor ${motor} ${direction}`);
    if (!resp1) {
      console.error(`❌ Keine Antwort bei Bewegungsbefehl für ${motor}`);
      return res.json({ success: false, message: 'Keine Antwort bei Bewegungsbefehl' });
    }
    
    console.log(`⏱️ Warte ${wartezeit}ms...`);
    
    // 2. Warte die berechnete Zeit
    await new Promise(resolve => setTimeout(resolve, wartezeit));
    
    console.log(`⏱️ Wartezeit vorbei, sende STOP`);
    
    // 3. Sende STOP
    const frameStop = buildStopFrame(motorNr);
    await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor} STOP`);
    
    console.log(`✓ ${motor}: Lamellen ${direction} ${wartezeit}ms abgeschlossen`);
    
    // Aktualisiere Status
    motorStatus[motor] = direction === 'up' ? '◐' : '◑';
    
    return res.json({ success: true, message: `Lamellen ${direction === 'up' ? 'geöffnet' : 'geschlossen'} (${wartezeit}ms)` });
    
  } catch (error) {
    console.error('Error processing lamellen-stufe:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Motor-Laufzeiten/Wendezeit/Antippzeiten lesen
app.get('/api/motor/times', async (req, res) => {
  const motorParam = req.query.motor as string | undefined;
  if (!motorParam) return res.status(400).json({ success: false, message: 'motor erforderlich' });

  const motorObj = motorConfig.motors.find((m: any) => m.name === motorParam || m.technicalName === motorParam);
  if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });

  const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
  if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });

  let motorNr: number | undefined = undefined;
  if (sps && motorObj.name && motorObj.technicalName) {
    motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
  }
  if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });

  try {
    const values = await readMotorTimes(sps.host, sps.port, motorNr);
    if (!values) return res.json({ success: false, message: 'Keine Antwort von SPS' });
    return res.json({ success: true, data: values });
  } catch (e) {
    console.error('❌ Fehler beim Lesen der Motor-Zeiten:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
  }
});

// Motor-Laufzeiten/Wendezeit/Antippzeiten schreiben
app.post('/api/motor/times', async (req, res) => {
  const { motor, laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit } = req.body || {};
  if (!motor) return res.status(400).json({ success: false, message: 'motor erforderlich' });

  const motorObj = motorConfig.motors.find((m: any) => m.name === motor || m.technicalName === motor);
  if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });

  const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
  if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });

  let motorNr: number | undefined = undefined;
  if (sps && motorObj.name && motorObj.technicalName) {
    motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
  }
  if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });

  const payload = { laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit };

  try {
    const ok = await writeMotorTimes(sps.host, sps.port, motorNr, payload);
    if (!ok) return res.json({ success: false, message: 'Keine Antwort von SPS' });

    // Nach erfolgreichem Schreiben zur Kontrolle erneut lesen
    const verify = await readMotorTimes(sps.host, sps.port, motorNr);
    return res.json({ success: true, data: verify || null });
  } catch (e) {
    console.error('❌ Fehler beim Schreiben der Motor-Zeiten:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
  }
});

// Motor-Konfiguration API Endpoint
app.get('/api/motors/config', (req, res) => {
  res.json(motorConfig);
});

// Motor-Name aktualisieren
app.post('/api/motors/update-name', (req, res) => {
  try {
    const { technicalName, displayName } = req.body;
    
    // Finde Motor in Config
    const motor = motorConfig.motors.find((m: any) => m.technicalName === technicalName);
    if (!motor) {
      return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    }
    
    // Aktualisiere displayName
    motor.displayName = displayName;
    
    // Speichere in Datei
    fs.writeFileSync(motorConfigPath, JSON.stringify(motorConfig, null, 2), 'utf-8');
    
    console.log(`📝 Motor-Name aktualisiert: ${technicalName} → "${displayName}"`);
    res.json({ success: true, message: 'Name erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Motor-Namens:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Status Query Endpoint - Gibt aktuellen Status aller Motoren zurück
app.get('/api/motors/status', async (req, res) => {
  try {
    res.json({ 
      success: true, 
      motorStatus
    });
  } catch (error) {
    console.error('Error querying motor status:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Raum-Icons API Endpoints

// Liefert die gesamte Raumkonfiguration inkl. Reihenfolge
app.get('/api/rooms/config', (req, res) => {
  res.json(roomConfig);
});

// Liefert nur die Reihenfolge der Räume
app.get('/api/rooms/order', (req, res) => {
  res.json({ order: roomConfig.order || [] });
});

// Setzt die Reihenfolge der Räume
app.post('/api/rooms/order', express.json(), (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
    }
    roomConfig.order = order;
    fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
    console.log('🗂️ Raum-Reihenfolge gespeichert:', order);
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Speichern der Raum-Reihenfolge:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

app.post('/api/rooms/update-icon', (req, res) => {
  try {
    const { roomName, icon } = req.body;
    
    if (!roomName || !icon) {
      return res.status(400).json({ success: false, message: 'roomName und icon sind erforderlich' });
    }
    
    // Aktualisiere Icon
    if (!roomConfig.rooms) {
      roomConfig.rooms = {};
    }
    roomConfig.rooms[roomName] = { icon };
    // Füge neuen Raum ggf. ans Ende der Reihenfolge an
    if (roomConfig.order && !roomConfig.order.includes(roomName)) {
      roomConfig.order.push(roomName);
    }
    // Speichere in Datei
    fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
    console.log(`🏠 Raum-Icon aktualisiert: ${roomName} → ${icon}`);
    res.json({ success: true, message: 'Icon erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Raum-Icons:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Gruppen API Endpoints

// Liefert die gesamte Gruppenkonfiguration inkl. Reihenfolge
app.get('/api/groups/config', (req, res) => {
  res.json(groupsConfig);
});

// Liefert nur die Reihenfolge der Gruppen
app.get('/api/groups/order', (req, res) => {
  res.json({ order: groupsConfig.order || [] });
});



// Setzt die Reihenfolge der Gruppen
app.post('/api/groups/order', express.json(), (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
    }
    groupsConfig.order = order;
    fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
    console.log('🗂️ Gruppen-Reihenfolge gespeichert:', order);
    res.json({ success: true });
  } catch (error) {
    console.error('Fehler beim Speichern der Gruppen-Reihenfolge:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Erstellt oder aktualisiert eine Gruppe
app.post('/api/groups/update', express.json(), (req, res) => {
  try {
    const { groupName, windows } = req.body;
    
    if (!groupName || !Array.isArray(windows)) {
      return res.status(400).json({ success: false, message: 'groupName und windows (Array) sind erforderlich' });
    }
    
    // Aktualisiere Gruppe
    groupsConfig.groups[groupName] = windows;
    // Füge neue Gruppe ggf. ans Ende der Reihenfolge an
    if (groupsConfig.order && !groupsConfig.order.includes(groupName)) {
      groupsConfig.order.push(groupName);
    }
    // Speichere in Datei
    fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
    console.log(`👥 Gruppe aktualisiert: ${groupName} → ${windows.join(', ')}`);
    res.json({ success: true, message: 'Gruppe erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Gruppe:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// Löscht eine Gruppe
app.delete('/api/groups/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    
    if (!groupsConfig.groups[groupName]) {
      return res.status(404).json({ success: false, message: 'Gruppe nicht gefunden' });
    }
    
    delete groupsConfig.groups[groupName];
    // Entferne aus Reihenfolge
    if (groupsConfig.order) {
      groupsConfig.order = groupsConfig.order.filter(g => g !== groupName);
    }
    // Speichere in Datei
    fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
    console.log(`🗑️ Gruppe gelöscht: ${groupName}`);
    res.json({ success: true, message: 'Gruppe erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Gruppe:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
});

// SPS-Automatiken API Endpoints

// Hilfsfunktion: Build SPS-Automatik Frame (14 bytes)
function buildSPSAutomatikFrame(address: number, value: number): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const payload = [TYP, 0x00, 0x01, 0x01, 0x69, address, 0x00, value, 0x00];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Build Zeitsynchronisations-Frame (16 bytes)
function buildTimeSyncFrame(date?: Date): Buffer {
  const now = date || new Date();
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const OPCODE = 0x21; // Zeitsynchronisation
  
  const year = now.getFullYear();
  const yearLow = year & 0xFF;
  const yearHigh = (year >> 8) & 0xFF;
  const month = now.getMonth() + 1; // 0-11 → 1-12
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  
  const payload = [TYP, 0x00, OPCODE, yearLow, yearHigh, month, day, hour, minute, second, 0x00];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Build SPS-Automatik Query Frame (liest 4 Adressen: 0x61, 0x62, 0x63, 0x64)
function buildSPSAutomatikQueryFrame(): Buffer {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const payload = [TYP, 0x00, 0x00, 0x04, 0x69, 0x61, 0x00, 0x69, 0x62, 0x00, 0x69, 0x63, 0x00, 0x69, 0x64, 0x00];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Parse SPS-Automatik Response (4 Word-Werte)
function parseSPSAutomatikResponse(buffer: Buffer) {
  if (!buffer || buffer.length < 20) return null;
  
  // Skip ACK frame if present
  let dataFrame = buffer;
  if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
    dataFrame = buffer.slice(5);
  }
  
  // Response structure: 02 [LEN] 41 00 00 04 [val1_low val1_high] [val2_low val2_high] [val3_low val3_high] [val4_low val4_high] 03 [CK]
  // Values start at byte 6
  const zeitautomatikB10 = dataFrame[6] | (dataFrame[7] << 8); // 0x61: 0=AUS, 1=AN, 2=Zufallsautomatik
  const beschattung = (dataFrame[8] | (dataFrame[9] << 8)) === 0x01; // 0x62: 1=AN, 0=AUS
  const daemmerung = (dataFrame[10] | (dataFrame[11] << 8)) === 0x01; // 0x63: 1=AN, 0=AUS
  const zeitautomatikB16 = (dataFrame[12] | (dataFrame[13] << 8)) === 0x01; // 0x64: 1=AN, 0=AUS
  
  return { zeitautomatikB10, beschattung, daemmerung, zeitautomatikB16 };
}

// GET /api/sps/automatiken/:spsName - Liest alle Automatiken einer SPS
app.get('/api/sps/automatiken/:spsName', async (req, res) => {
  console.log('📊 GET /api/sps/automatiken/:spsName aufgerufen');
  const { spsName } = req.params;
  
  const sps = spsMapping[spsName];
  if (!sps) {
    return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  }
  
  try {
    const frame = buildSPSAutomatikQueryFrame();
    console.log('📤 Query Frame:', frame.toString('hex'));
    
    const response = await new Promise<Buffer | null>((resolve) => {
      const socket = net.createConnection({ host: sps.host, port: sps.port });
      let responseBuffer = Buffer.alloc(0);
      let timeoutHandle: NodeJS.Timeout;
      
      socket.on('connect', () => {
        console.log(`✅ Verbunden mit ${sps.host}:${sps.port}`);
        socket.write(frame);
      });
      
      socket.on('data', (data) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);
        console.log(`📥 Automatiken Response chunk ${sps.host}:${sps.port}:`, data.toString('hex'));
      });
      
      socket.on('error', (err) => {
        console.error('❌ Socket Error:', err.message);
        clearTimeout(timeoutHandle);
        resolve(null);
      });
      
      socket.on('close', () => {
        clearTimeout(timeoutHandle);
        console.log(`🔌 Socket geschlossen, empfangen: ${responseBuffer.length} bytes`);
        resolve(responseBuffer.length > 0 ? responseBuffer : null);
      });
      
      timeoutHandle = setTimeout(() => {
        console.log('⏱️ Timeout nach 250ms');
        socket.destroy();
        resolve(responseBuffer.length > 0 ? responseBuffer : null);
      }, 250);
    });
    
    if (response) {
      console.log(`📥 Complete Response ${sps.host}:${sps.port}:`, response.toString('hex'));
      const parsed = parseSPSAutomatikResponse(response);
      if (parsed) {
        console.log('✅ Parsed Automatiken:', parsed);
        return res.json({ success: true, data: parsed });
      }
    }
    
    return res.json({ success: false, message: 'Keine Antwort von SPS' });
  } catch (e) {
    console.error('❌ Fehler bei Automatiken-Query:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Query' });
  }
});

// POST /api/sps/automatiken/toggle - Schaltet eine Automatik
app.post('/api/sps/automatiken/toggle', async (req, res) => {
  console.log('🔄 POST /api/sps/automatiken/toggle aufgerufen');
  const { spsName, type, value } = req.body;
  
  if (!spsName || !type || value === undefined) {
    return res.status(400).json({ success: false, message: 'spsName, type und value erforderlich' });
  }
  
  const sps = spsMapping[spsName];
  if (!sps) {
    return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
  }
  
  // Adress-Mapping
  const addressMap: Record<string, number> = {
    zeitautomatikB10: 0x61,
    beschattung: 0x62,
    daemmerung: 0x63,
    zeitautomatikB16: 0x64
  };
  
  const address = addressMap[type];
  if (!address) {
    return res.status(400).json({ success: false, message: 'Ungültiger Automatik-Typ' });
  }
  
  // Wert-Konvertierung
  let byteValue: number;
  if (type === 'zeitautomatikB10') {
    byteValue = typeof value === 'number' ? value : (value ? 1 : 0); // 0=AUS, 1=AN, 2=Zufallsautomatik
  } else {
    byteValue = value ? 0x01 : 0x00; // Beschattung/Dämmerung/B16: 1=AN, 0=AUS
  }
  
  try {
    const frame = buildSPSAutomatikFrame(address, byteValue);
    console.log(`📤 Toggle ${type} → ${byteValue}:`, frame.toString('hex'));
    
    const success = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: sps.host, port: sps.port });
      let responseReceived = false;
      let timeoutHandle: NodeJS.Timeout;
      
      socket.on('connect', () => {
        console.log(`✅ Verbunden mit ${sps.host}:${sps.port}`);
        socket.write(frame);
      });
      
      socket.on('data', (data) => {
        responseReceived = true;
        console.log('📥 SPS-Antwort:', data.toString('hex'));
      });
      
      socket.on('error', (err) => {
        console.error('❌ Socket Error:', err.message);
        clearTimeout(timeoutHandle);
        resolve(false);
      });
      
      socket.on('close', () => {
        clearTimeout(timeoutHandle);
        console.log(`🔌 Socket geschlossen, Response: ${responseReceived ? 'JA' : 'NEIN'}`);
        resolve(responseReceived);
      });
      
      timeoutHandle = setTimeout(() => {
        console.log('⏱️ Timeout nach 250ms');
        socket.destroy();
        resolve(responseReceived);
      }, 250);
    });
    
    if (success) {
      console.log(`✅ ${type} erfolgreich geschaltet`);
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Keine Antwort von SPS' });
    }
  } catch (e) {
    console.error('❌ Fehler beim Schalten:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
  }
});

// GET /api/sps/sync-time - Sendet aktuelle Zeit an alle SPSsen
app.get('/api/sps/sync-time', async (req, res) => {
  console.log('🕐 GET /api/sps/sync-time aufgerufen');
  
  try {
    const now = new Date();
    const frame = buildTimeSyncFrame(now);
    const timeStr = now.toLocaleString('de-DE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    console.log(`📤 Zeitsynchronisation Frame: ${frame.toString('hex')}`);
    console.log(`📅 Zeit: ${timeStr}`);
    
    const results: Record<string, { success: boolean; message?: string }> = {};
    
    // Sende an alle SPSsen
    for (const [spsName, spsData] of Object.entries(spsMapping)) {
      console.log(`📡 Sende an ${spsName} (${spsData.host}:${spsData.port})...`);
      
      const success = await new Promise<boolean>((resolve) => {
        const socket = net.createConnection({ host: spsData.host, port: spsData.port });
        let responseReceived = false;
        let timeoutHandle: NodeJS.Timeout;
        
        socket.on('connect', () => {
          console.log(`✅ Verbunden mit ${spsName}`);
          socket.write(frame);
        });
        
        socket.on('data', (data) => {
          responseReceived = true;
          console.log(`📥 ${spsName} Antwort:`, data.toString('hex'));
        });
        
        socket.on('error', (err) => {
          console.error(`❌ ${spsName} Error:`, err.message);
          clearTimeout(timeoutHandle);
          resolve(false);
        });
        
        socket.on('close', () => {
          clearTimeout(timeoutHandle);
          console.log(`🔌 ${spsName} Socket geschlossen, Response: ${responseReceived ? 'JA' : 'NEIN'}`);
          resolve(responseReceived);
        });
        
        timeoutHandle = setTimeout(() => {
          console.log(`⏱️ ${spsName} Timeout nach 250ms`);
          socket.destroy();
          resolve(responseReceived);
        }, 250);
      });
      
      results[spsName] = {
        success,
        message: success ? 'Zeit synchronisiert' : 'Keine Antwort'
      };
    }
    
    const allSuccess = Object.values(results).every(r => r.success);
    const successCount = Object.values(results).filter(r => r.success).length;
    
    console.log(`✅ Zeitsynchronisation abgeschlossen: ${successCount}/${Object.keys(spsMapping).length} SPSsen erfolgreich`);
    
    return res.json({ 
      success: allSuccess, 
      time: timeStr,
      results 
    });
  } catch (e) {
    console.error('❌ Fehler bei Zeitsynchronisation:', e);
    return res.status(500).json({ success: false, message: 'Fehler bei Zeitsynchronisation' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motor Control Backend läuft auf http://0.0.0.0:${PORT}`);
  console.log(`📡 Verbindungen zu 3 SPS-Stationen konfiguriert`);
  console.log(`🌐 Netzwerk-Zugriff: http://192.168.178.93:${PORT}`);
});

// Keep ES module process alive
setInterval(() => {}, 2147483647);

