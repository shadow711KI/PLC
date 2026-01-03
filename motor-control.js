// motor-control.js
// Steuert Motoren per Name aus addresses.json
// Verwendung: node motor-control.js "Arbeiten" runter

import net from 'node:net';
import fs from 'fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const STATUS_CODES = {
  'hoch': 0x01,
  'runter': 0x02,
  'stop': 0x03
};

let lastDirection = null; // Track der letzten Fahrtrichtung

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

// Alle Motoren auflisten
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

// Kommandozeilenargumente
const motorName = process.argv[2];
const command = process.argv[3];

if (!motorName || !command) {
  console.log('\nVerwendung:');
  console.log('  node motor-control.js <motor> <befehl>\n');
  console.log('Beispiele:');
  console.log('  node motor-control.js Arbeiten runter');
  console.log('  node motor-control.js Wohnen_Ost hoch');
  console.log('  node motor-control.js Schlafen_Sued stop\n');
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
  // STOP nutzt komplexes 27-Byte Format
  frame = buildStopFrame(motor.motorData.nr);
} else {
  // HOCH/RUNTER nutzen einfaches 13-Byte Format
  frame = buildFrame(motor.motorData.nr, status);
}
console.log(`TX: ${frame.toString('hex')}`);

const sock = net.createConnection({ host: motor.spsData.host, port: motor.spsData.port });

let responses = '';
let responseReceived = false;

sock.on('connect', () => {
  sock.write(frame);
  // Wait 1 second for response then close
  setTimeout(() => {
    sock.destroy();
  }, 1000);
});

sock.on('data', (buf) => {
  responses += buf.toString('hex');
  console.log(`RX: ${buf.toString('hex')}`);
  responseReceived = true;
});

sock.on('error', (e) => {
  console.log(`\n✗ Fehler: ${e.message}`);
  process.exit(1);
});

sock.on('close', () => {
  if (!responseReceived) {
    console.log('\n✗ Keine Antwort vom Motor');
    process.exit(1);
  } else if (responses.includes('1503')) {
    console.log('\n✗ Motor nicht konfiguriert (Fehler 1503)');
    process.exit(1);
  } else if (responses.includes('0203400006') || responses.includes('0203400021')) {
    console.log('\n✓ ERFOLG!\n');
    process.exit(0);
  } else {
    console.log('\n? Unbekannte Antwort\n');
    process.exit(1);
  }
});
