// motor-control.js
// Steuert Motoren per Name aus addresses.json (Robuste TCP Version für Linux)
// Verwendung: node motor-control.js "Arbeiten" runter

import net from 'node:net';
import fs from 'fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const STATUS_CODES = {
  'hoch': 0x01,
  'runter': 0x02,
  'stop': 0x03
};

// Einfacher Frame für HOCH/RUNTER (13 bytes, OpCode 0x01)
function buildFrame(motorNr, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  
  const statusByte = (motorNr - 1) * 0x10 + status;
  
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

// Komplexer Frame für STOP (27 bytes gesamt)
function buildStopFrame(motorNr) {
  const motorIdx = motorNr - 1;
  
  // Berechne Motor-spezifische Bytes
  const b7 = (motorIdx * 0x10) + 0x0D;
  const b13 = (motorIdx * 0x10) + 0x0E;
  const b17 = (motorIdx * 0x10) + 0x03;
  const b21 = (motorIdx * 0x10) + 0x04;
  
  // Payload (22 bytes) - OHNE ETX!
  const payload = [
    0x41, 0x00, 0x01, 0x04,          // Bytes 0-3
    0x69, b7, 0x00,                  // Bytes 4-6
    0x30, 0x75, 0x69,                // Bytes 7-9
    b13, 0x00,                        // Bytes 10-11
    0x30, 0x75, 0x48,                // Bytes 12-14
    b17, 0x00, 0x00,                 // Bytes 15-17
    0x48, b21, 0x00, 0x00            // Bytes 18-21 (22 bytes insgesamt)
  ];
  
  const STX = 0x02;
  const LEN = payload.length;  // 0x16 = 22
  const ETX = 0x03;
  
  // Frame: STX + LEN + Payload (22) + ETX
  const frameData = [STX, LEN, ...payload, ETX];
  
  // Berechne Checksum über Payload (OHNE LEN, OHNE ETX)
  let sum = 0;
  for (let i = 2; i < frameData.length - 1; i++) {
    sum += frameData[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameData, ckLow, ckHigh]);
}

// Motor nach Name finden - Sucht in ALLEN SPS
function findMotor(motorName) {
  for (const [spsName, spsData] of Object.entries(spsMap)) {
    if (spsData.motors) {
      for (const [name, motorData] of Object.entries(spsData.motors)) {
        if (name.toLowerCase() === motorName.toLowerCase()) {
          return { spsName, spsData, motorName: name, motorData };
        }
      }
    }
  }
  return null;
}

// Kommandozeilenargumente
const motorName = process.argv[2];
const command = process.argv[3];

if (!motorName || !command) {
  console.log('\nVerwendung:');
  console.log('  node motor-control.js <motor> <befehl>\n');
  listMotors();
  process.exit(1);
}

if (!STATUS_CODES[command.toLowerCase()]) {
  console.log(`\n✗ Unbekannter Befehl: ${command}`);
  console.log('Gültige Befehle: hoch, runter, stop\n');
  process.exit(1);
}

const motor = findMotor(motorName);
if (!motor) {
  console.log(`\n✗ Motor nicht gefunden: ${motorName}\n`);
  listMotors();
  process.exit(1);
}

let status = STATUS_CODES[command.toLowerCase()];

console.log(`\n${motor.spsName}: ${motor.motorName} → ${command.toUpperCase()}`);

// Unterschiedliche Frames je nach Befehl
let frame;
if (command.toLowerCase() === 'stop') {
  frame = buildStopFrame(motor.motorData.nr);
} else {
  frame = buildFrame(motor.motorData.nr, status);
}
console.log(`TX: ${frame.toString('hex')}`);

const sock = net.createConnection({ host: motor.spsData.host, port: motor.spsData.port });

// Buffer für die Antwort sammeln
let receivedBuffer = [];
let responseTimeoutId = null;

/**
 * Verarbeitet den gesammelten Puffer und beendet das Skript.
 */
function processResponse() {
  // Alle gepufferten Daten zu einem Buffer zusammenfügen
  const fullData = Buffer.concat(receivedBuffer);
  const hexStr = fullData.toString('hex');

  if (fullData.length === 0) {
    console.log('\n✗ Timeout: Keine Antwort vom Motor empfangen.');
  } else {
    // Logik zur Analyse der Antwort basierend auf Hex-Strings
    if (hexStr.includes('1503')) {
      console.log('\n✗ Fehler 1503: Motor nicht konfiguriert');
    } else if (hexStr.includes('0203400006') || hexStr.includes('0203400021')) {
      console.log('\n✓ ERFOLG!');
    } else {
      console.log(`\n? Unbekannte Antwort: ${hexStr}`);
    }
  }

  // Aufräumen und Beenden
  sock.end();
  process.exit(fullData.length > 0 && (hexStr.includes('0203400006') || hexStr.includes('0203400021')) ? 0 : 1);
}

sock.on('connect', () => {
  console.log('Verbunden mit SPS...');
  
  // Starte einen Timeout, falls sofort keine Antwort kommt (z.B. bei sehr schnellen Motoren ohne Antwort)
  // Oder setze ihn zurück, sobald Daten kommen.
  responseTimeoutId = setTimeout(() => {
    // Falls nach 2 Sekunden immer noch nichts da ist, gehe von Timeout aus
    if (receivedBuffer.length === 0) {
      processResponse(); // Führt zum Exit wegen leerem Buffer
    }
  }, 2000);

  sock.write(frame);
});

sock.on('data', (chunk) => {
  // Daten sammeln
  receivedBuffer.push(chunk);
  
  console.log(`RX: ${chunk.toString('hex')}`);

  // Timeout zurücksetzen, da wir Daten bekommen haben. 
  // Dies verhindert Timeouts, wenn die Antwort in mehreren kleinen Paketen kommt.
  clearTimeout(responseTimeoutId);
  responseTimeoutId = setTimeout(() => {
    // Wenn keine weiteren Daten mehr kommen (2 Sekunden Stille), ist die Antwort komplett.
    processResponse();
  }, 1000); // 1 Sekunde Wartezeit nach dem letzten Byte für Abschluss
});

sock.on('error', (e) => {
  console.log(`\n✗ Socket-Fehler: ${e.message}`);
  clearTimeout(responseTimeoutId);
  process.exit(1);
});

// Falls der Server die Verbindung ohne Daten schließt
sock.on('end', () => {
  if (!responseTimeoutId || receivedBuffer.length > 0) {
    // Wenn wir bereits eine Timeout-Logik aktiv haben, ignorieren wir dies hier oft, 
    // aber sicherheitshalber prüfen:
    clearTimeout(responseTimeoutId);
    processResponse();
  }
});

function listMotors() {
  console.log('\nVerfügbare Motoren:\n');
  for (const [spsName, spsData] of Object.entries(spsMap)) {
    console.log(`${spsName}:`);
    if (spsData.motors) {
      for (const motorName of Object.keys(spsData.motors)) {
        console.log(`  - ${motorName}`);
      }
    }
  }
  console.log('');
}