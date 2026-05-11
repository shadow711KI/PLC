
// Minimaler SPS-REST-Adapter für Home Assistant (ALLE App-Funktionen)
import express from 'express';
import net from 'net';
import fs from 'fs';
import { getStatusByte48, getStatusWord69 } from './sps-statusbyte-helper.js';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));
const app = express();
app.use(express.json());

function findMotorById(motorName) {
  for (const [spsName, spsData] of Object.entries(spsMap)) {
    for (const [name, motorData] of Object.entries(spsData.motors)) {
      if (name === motorName) {
        return { spsData, motorData };
      }
    }
  }
  return null;
}


// Motorsteuerung (hoch/runter/stop)
function buildFrame(motorNr, befehl) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x48;
  // Statusbyte exakt wie im Projekt
  const statusByte = parseInt(getStatusByte48(motorNr, befehl), 16);
  const payload = [TYP, STATION, opCount, opcode, 0x00, 0x00, 0x00, 0x00, statusByte];
  const LEN = payload.length;
  const frameNoCksum = [STX, LEN, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// STOP-Frame (27 Byte, wie in CLI)
function buildStopFrame(motorNr) {
  const b7 = parseInt(getStatusByte48(motorNr, 'stop'), 16);
  const b13 = parseInt(getStatusByte48(motorNr, 'motor_stop2'), 16);
  const b17 = parseInt(getStatusByte48(motorNr, 'hoch'), 16);
  const b21 = parseInt(getStatusByte48(motorNr, 'runter'), 16);
  const payload = [
    0x41, 0x00, 0x01, 0x04,
    0x69, b7, 0x00,
    0x30, 0x75, 0x69,
    b13, 0x00,
    0x30, 0x75, 0x48,
    b17, 0x00, 0x00,
    0x48, b21, 0x00, 0x00
  ];
  const STX = 0x02;
  const LEN = payload.length;
  const ETX = 0x03;
  const frameData = [STX, LEN, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameData.length - 1; i++) sum += frameData[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameData, ckLow, ckHigh]);
}

// Lamellensteuerung (öffnen/schließen)
function buildLamellenFrame() {
  // 020941000101695F000000030B01
  return Buffer.from('020941000101695F000000030B01', 'hex');
}

// Zeitautomatik-Frame (READ/WRITE)
function buildZeitautomatikReadFrame(motorNr, addrLow, addrHigh) {
  // 14-Byte-Frame für Zeitautomatik-Read (OpCode 0x69, Word Read)
  // 02 09 41 00 01 01 69 [ADDR] 00 00 00 03 [CK]
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const LEN = 0x09;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x69;
  const addr = parseInt(getStatusWord69(motorNr, 'zeitschaltpunkt1'), 16); // Startadresse
  const addrLowByte = addr & 0xFF;
  const addrHighByte = (addr >> 8) & 0xFF;
  const payload = [TYP, STATION, opCount, opcode, addrLowByte, addrHighByte, 0x00, 0x00, 0x00];
  const frameNoCksum = [STX, LEN, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function sendFrame(frame, host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port });
    let response = Buffer.alloc(0);
    let timeout = setTimeout(() => {
      sock.destroy();
      reject(new Error('Timeout'));
    }, 2000);
    sock.on('connect', () => sock.write(frame));
    sock.on('data', (data) => {
      response = Buffer.concat([response, data]);
      clearTimeout(timeout);
      sock.destroy();
      resolve(response);
    });
    sock.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function sendFrame(frame, host, port) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port });
    let response = Buffer.alloc(0);
    let timeout = setTimeout(() => {
      sock.destroy();
      reject(new Error('Timeout'));
    }, 2000);
    sock.on('connect', () => sock.write(frame));
    sock.on('data', (data) => {
      response = Buffer.concat([response, data]);
      clearTimeout(timeout);
      sock.destroy();
      resolve(response);
    });
    sock.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

app.post('/motor/control', async (req, res) => {
  const { motorName, command } = req.body;
  if (!motorName || !command) return res.status(400).json({ error: 'motorName und command erforderlich' });
  const motor = findMotorById(motorName);
  if (!motor) return res.status(404).json({ error: 'Motor nicht gefunden' });
  let befehl;
  let frame;
  if (command === 'up') befehl = 'hoch';
  else if (command === 'down') befehl = 'runter';
  else if (command === 'stop') {
    frame = buildStopFrame(motor.motorData.nr);
  } else if (command === 'lamellen_auf') {
    frame = buildLamellenFrame();
  } else if (command === 'lamellen_zu') {
    frame = buildLamellenFrame();
  } else return res.status(400).json({ error: 'Ungültiger command' });
  try {
    if (!frame) frame = buildFrame(motor.motorData.nr, befehl);
    await sendFrame(frame, motor.spsData.host, motor.spsData.port);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Statusabfrage (Position)
app.get('/motor/status', async (req, res) => {
  const { motorName } = req.query;
  if (!motorName) return res.status(400).json({ error: 'motorName erforderlich' });
  const motor = findMotorById(motorName);
  if (!motor) return res.status(404).json({ error: 'Motor nicht gefunden' });
  // Status-Frame für alle Motoren (wie in CLI)
  function buildAllMotorsStatusQuery() {
    // 72-Byte-Frame aus CLI übernehmen (hexString)
    const hexString = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
    return Buffer.from(hexString, 'hex');
  }
  try {
    const frame = buildAllMotorsStatusQuery();
    const response = await sendFrame(frame, motor.spsData.host, motor.spsData.port);
    // Position extrahieren (wie parseStatusResponse in CLI)
    // Suche Daten-Frame (beginnt mit STX=0x02, dann LEN, dann TYPE=0x41)
    let dataFrameStart = -1;
    for (let i = 0; i < response.length - 3; i++) {
      if (response[i] === 0x02 && response[i + 2] === 0x41) {
        dataFrameStart = i;
        break;
      }
    }
    if (dataFrameStart === -1) return res.status(500).json({ error: 'Kein Daten-Frame' });
    const dataStart = dataFrameStart + 6;
    const motorIdx = motor.motorData.nr - 1;
    const motorByteOffset = dataStart + (motorIdx * 2);
    if (motorByteOffset + 1 >= response.length) return res.status(500).json({ error: 'Daten zu kurz' });
    const positionByteHigh = response[motorByteOffset];
    const positionByteLow = response[motorByteOffset + 1];
    let motorPosition = 'UNBEKANNT';
    if (positionByteHigh === 0x00 && positionByteLow === 0x00) motorPosition = 'OBEN';
    else if (positionByteHigh === 0x00 && positionByteLow === 0x01) motorPosition = 'UNTEN';
    else if (positionByteHigh === 0x01 && positionByteLow === 0x00) motorPosition = 'OBEN';
    else motorPosition = `POSITION 0x${positionByteHigh.toString(16).toUpperCase()}${positionByteLow.toString(16).toUpperCase()}`;
    res.json({ success: true, position: motorPosition, raw: response.toString('hex') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Zeitautomatik-Read
app.get('/zeitautomatik/read', async (req, res) => {
  const { motorName } = req.query;
  if (!motorName) return res.status(400).json({ error: 'motorName erforderlich' });
  const motor = findMotorById(motorName);
  if (!motor) return res.status(404).json({ error: 'Motor nicht gefunden' });
  try {
    const frame = buildZeitautomatikReadFrame(motor.motorData.nr, motor.motorData.addrLow, motor.motorData.addrHigh);
    const response = await sendFrame(frame, motor.spsData.host, motor.spsData.port);
    // Dummy: Rohdaten zurückgeben (Parsing nachrüsten)
    res.json({ success: true, raw: response.toString('hex') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Automatik ein/aus (Word Write, invertierte Logik)
app.post('/automatik', async (req, res) => {
  const { motorName, enable } = req.body;
  if (!motorName || typeof enable !== 'boolean') return res.status(400).json({ error: 'motorName und enable (bool) erforderlich' });
  const motor = findMotorById(motorName);
  if (!motor) return res.status(404).json({ error: 'Motor nicht gefunden' });
  // Invertierte Logik: 0x00 = AN, 0x01 = AUS
  const value = enable ? 0x00 : 0x01;
  // 14-Byte-Frame für Automatik ein/aus
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const LEN = 0x09;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x69;
  const addr = parseInt(getStatusWord69(motor.motorData.nr, 'autom_ein_aus'), 16);
  const addrLowByte = addr & 0xFF;
  const addrHighByte = (addr >> 8) & 0xFF;
  const payload = [TYP, STATION, opCount, opcode, addrLowByte, addrHighByte, 0x00, value, 0x00];
  const frameNoCksum = [STX, LEN, ...payload, ETX];
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);
  try {
    await sendFrame(frame, motor.spsData.host, motor.spsData.port);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3001, () => console.log('SPS-REST-Adapter läuft auf Port 3001'));
