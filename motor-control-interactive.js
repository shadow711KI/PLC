#!/usr/bin/env node


import net from 'node:net';
import fs from 'fs';
import readline from 'readline';
import { getStatusByte48 } from './sps-statusbyte-helper.js';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const STATUS_CODES = {
  1: 'hoch',
  2: 'runter',
  3: 'stop'
};

const ACTIONS = {
  1: { name: 'HOCH', code: 0x01 },
  2: { name: 'RUNTER', code: 0x02 },
  3: { name: 'STOP', code: 0x03 },
  4: { name: 'LAMELLEN ÖFFNEN', code: 0x02 }, // = RUNTER wenn bereits unten
  5: { name: 'LAMELLEN SCHLIEẞEN', code: 0x04 }
};

// Alle Motoren auflisten (von ALLEN SPS)
const motorList = [];
for (const [spsName, spsData] of Object.entries(spsMap)) {
  if (spsData.motors) {
    for (const [motorName, motorData] of Object.entries(spsData.motors)) {
      motorList.push({
        name: motorName,
        spsName: spsName,
        spsData: spsData,
        motorData
      });
    }
  }
}

// Einfacher Frame für HOCH/RUNTER (13 bytes, OpCode 0x01)
function buildFrame(motorNr, befehl) {
  // befehl: 'hoch', 'runter', ...
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;

  // Nutze Hilfsfunktion für Statusbyte
  const statusByte = parseInt(getStatusByte48(motorNr, befehl), 16);

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
  // Nutze Hilfsfunktion für Statusbytes
  const b7 = parseInt(getStatusByte48(motorNr, 'stop'), 16);
  const b13 = parseInt(getStatusByte48(motorNr, 'motor_stop2'), 16); // 0x0E
  const b17 = parseInt(getStatusByte48(motorNr, 'hoch'), 16); // 0x01
  const b21 = parseInt(getStatusByte48(motorNr, 'runter'), 16); // 0x02

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

// Lamellen-Frame (Wendefunktion)
// Basierend auf 020941000101695F000000030B01
// WICHTIG: 0x695F ist für ALLE Motoren gleich!
function buildLamellenFrame(motorNr) {
  const STX = 0x02;
  const LEN = 0x09;
  const TYP = 0x41;
  const STATION = 0x00;
  const OPCODE = 0x01;
  const COUNT = 0x01;
  
  // Operand: 0x695F ist konstant für alle Motoren
  const payload = [TYP, STATION, OPCODE, COUNT, 0x69, 0x5F, 0x00, 0x00, 0x00];
  const ETX = 0x03;
  
  const frameNoCksum = [STX, LEN, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Status Query Frame (Session #9 - Motor Position Query)
// Dies ist der große 72-Byte Frame, der alle 6 Motoren abfragt
function buildAllMotorsStatusQuery() {
  const hexString = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
  return Buffer.from(hexString, 'hex');
}

function queryMotorStatus(motorNr, host, port) {
  return new Promise((resolve) => {
    // Sende den großen Frame, der alle 6 Motoren abfragt
    const frame = buildAllMotorsStatusQuery();
    const sock = net.createConnection({ host, port });
    
    let response = Buffer.alloc(0);
    let timeoutHandle;
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (data) => {
      response = Buffer.concat([response, data]);
      
      // Prüfe ob wir einen vollständigen Frame haben
      // Ein Frame endet mit ETX (0x03) + 2 Checksum-Bytes
      if (response.length >= 10) {
        // Suche nach ETX (0x03) in den letzten bytes
        for (let i = response.length - 3; i >= 0; i--) {
          if (response[i] === 0x03) {
            // ETX gefunden! Prüfe ob wir auch die Checksum haben
            if (i + 2 < response.length) {
              clearTimeout(timeoutHandle);
              sock.destroy();
              resolve(parseStatusResponse(response, motorNr));
              return;
            }
          }
        }
      }
    });
    
    sock.on('error', () => {
      clearTimeout(timeoutHandle);
      resolve(null);
    });
    
    timeoutHandle = setTimeout(() => {
      sock.destroy();
      resolve(null);
    }, 1500);
  });
}

function parseStatusResponse(buffer, motorNr) {
  // Suche den Daten-Frame (beginnt mit STX=0x02, dann LEN, dann TYPE=0x41)
  let dataFrameStart = -1;
  for (let i = 0; i < buffer.length - 3; i++) {
    if (buffer[i] === 0x02 && buffer[i + 2] === 0x41) {
      dataFrameStart = i;
      break;
    }
  }
  
  if (dataFrameStart === -1) {
    return {
      responseOK: false,
      motorPosition: 'FEHLER: Kein Daten-Frame',
      raw: buffer.toString('hex')
    };
  }
  
  // Daten starten bei Byte 6 nach STX
  // Jeder Motor hat 2 Bytes für Position (Byte_High, Byte_Low)
  const dataStart = dataFrameStart + 6;
  
  // Motor-Index (0-basiert)
  const motorIdx = motorNr - 1;
  
  // Jeder Motor = 2 Bytes
  const motorByteOffset = dataStart + (motorIdx * 2);
  
  if (motorByteOffset + 1 >= buffer.length) {
    return {
      responseOK: false,
      motorPosition: 'FEHLER: Daten zu kurz',
      raw: buffer.toString('hex')
    };
  }
  
  // Position des Motors (2 Bytes: High + Low)
  const positionByteHigh = buffer[motorByteOffset];
  const positionByteLow = buffer[motorByteOffset + 1];
  
  // Position dekodieren (beide Bytes prüfen)
  let motorPosition = 'UNBEKANNT';
  if (positionByteHigh === 0x00 && positionByteLow === 0x00) {
    motorPosition = 'OBEN ⬆️';
  } else if (positionByteHigh === 0x00 && positionByteLow === 0x01) {
    motorPosition = 'UNTEN ⬇️';
  } else if (positionByteHigh === 0x01 && positionByteLow === 0x00) {
    motorPosition = 'OBEN ⬆️';
  } else {
    motorPosition = `POSITION 0x${positionByteHigh.toString(16).toUpperCase()}${positionByteLow.toString(16).toUpperCase()}`;
  }
  
  return {
    responseOK: true,
    motorNr: motorNr,
    positionByteHigh: positionByteHigh,
    positionByteLow: positionByteLow,
    motorPosition: motorPosition,
    raw: buffer.toString('hex')
  };
}

// Hilfsfunktion: Einzelnen Frame senden
function sendFrame(frame, host, port) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    let responseReceived = false;
    

    sock.on('connect', () => {
      sock.write(frame);
      const msg = `[${new Date().toISOString()}] SPS-Telegramm SEND: ${frame.toString('hex')}`;
      console.log(msg);
      setTimeout(() => sock.destroy(), 1000);
    });

    sock.on('data', (data) => {
      responseReceived = true;
      const msg = `[${new Date().toISOString()}] SPS-Telegramm RECV: ${data.toString('hex')}`;
      console.log(msg);
    });
    
    sock.on('connect', () => {
      sock.write(frame);
      const msg = `[${new Date().toISOString()}] SPS-Telegramm SEND: ${frame.toString('hex')}`;
      console.log(msg);
    });

    sock.on('data', (data) => {
      response = Buffer.concat([response, data]);
      const msg = `[${new Date().toISOString()}] SPS-Telegramm RECV: ${data.toString('hex')}`;
      console.log(msg);
      // Prüfe ob wir einen vollständigen Frame haben
      // Ein Frame endet mit ETX (0x03) + 2 Checksum-Bytes
      if (response.length >= 10) {
        // Suche nach ETX (0x03) in den letzten bytes
        for (let i = response.length - 3; i >= 0; i--) {
          if (response[i] === 0x03) {
            // ETX gefunden! Prüfe ob wir auch die Checksum haben
            if (i + 2 < response.length) {
              clearTimeout(timeoutHandle);
              sock.destroy();
              resolve(parseStatusResponse(response, motorNr));
              return;
            }
          }
        }
      }
    });
  if (actionIdx === 4) {
    console.log('   🔄 Sequenz: HOCH → STOP');
    
    // 1. HOCH
    const frameHoch = buildFrame(motor.motorData.nr, 0x01);
    console.log('   ⬆️  HOCH...');
    const resp1 = await sendFrame(frameHoch, motor.spsData.host, motor.spsData.port);
    if (!resp1) {
      console.log('❌ Keine Antwort bei HOCH\n');
      return;
    }
    
    // 2. STOP
    const frameStop = buildStopFrame(motor.motorData.nr);
    console.log('   ⏹️  STOP...');
    const resp2 = await sendFrame(frameStop, motor.spsData.host, motor.spsData.port);
    
    console.log('✅ Lamellen geöffnet!\n');
    return;
  }
  
  // LAMELLEN SCHLIEẞEN: Sequenz RUNTER → STOP
  if (actionIdx === 5) {
    console.log('   🔄 Sequenz: RUNTER → STOP');
    
    // 1. RUNTER
    const frameRunter = buildFrame(motor.motorData.nr, 0x02);
    console.log('   ⬇️  RUNTER...');
    const resp1 = await sendFrame(frameRunter, motor.spsData.host, motor.spsData.port);
    if (!resp1) {
      console.log('❌ Keine Antwort bei RUNTER\n');
      return;
    }
    
    // 2. STOP
    const frameStop = buildStopFrame(motor.motorData.nr);
    console.log('   ⏹️  STOP...');
    const resp2 = await sendFrame(frameStop, motor.spsData.host, motor.spsData.port);
    
    console.log('✅ Lamellen geschlossen!\n');
    return;
  }
  
  // Normale Befehle: HOCH, RUNTER, STOP
  let frame;
  if (actionIdx === 3) {
    // STOP nutzt komplexe 27-byte Frame
    frame = buildStopFrame(motor.motorData.nr);
  } else {
    // HOCH/RUNTER nutzen einfache 13-byte Frame
    // actionIdx 1 = HOCH (0x01), actionIdx 2 = RUNTER (0x02)
    const statusCode = actionIdx === 1 ? 0x01 : 0x02;
    frame = buildFrame(motor.motorData.nr, statusCode);
  }
  
  const success = await sendFrame(frame, motor.spsData.host, motor.spsData.port);
  
  if (success) {
    console.log('✅ Motor antwortet - ERFOLG!\n');
  } else {
    console.log('⚠️  Keine Antwort vom Motor\n');
  }
}

// Interaktive CLI
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
  
  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };
  
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║       🎛️  MOTOR STEUERUNG - INTERAKTIV             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  let running = true;
  
  while (running) {
    console.log('┌────────────────────────────────────────────────────┐');
    console.log('│         MOTOR AUSWÄHLEN (1-' + motorList.length + ')                 │');
    console.log('└────────────────────────────────────────────────────┘\n');
    
    motorList.forEach((motor, idx) => {
      const num = idx + 1;
      console.log(`  ${num}. ${motor.name}`);
    });
    
    const motorChoice = await question('\n➜ Motor Nummer eingeben (1-' + motorList.length + ') oder "exit": ');
    
    if (motorChoice.toLowerCase() === 'exit' || motorChoice.toLowerCase() === 'q') {
      running = false;
      break;
    }
    
    const motorIdx = parseInt(motorChoice) - 1;
    if (isNaN(motorIdx) || motorIdx < 0 || motorIdx >= motorList.length) {
      console.log('\n❌ Ungültige Eingabe!\n');
      continue;
    }
    
    const selectedMotor = motorList[motorIdx];
    
    // STATUS ABFRAGEN bevor Befehle angezeigt werden
    console.log(`\n🔍 Prüfe Status von ${selectedMotor.name}...`);
    const currentStatus = await queryMotorStatus(selectedMotor.motorData.nr, selectedMotor.spsData.host, selectedMotor.spsData.port);
    
    if (currentStatus && currentStatus.responseOK) {
      console.log(`   ✅ Aktuelle Position: ${currentStatus.motorPosition}\n`);
    } else if (currentStatus) {
      console.log(`   ⚠️  Status-Antwort: FEHLER\n`);
    } else {
      console.log(`   ❌ Status konnte nicht abgefragt werden\n`);
    }
    
    // Befehl auswählen - Schleife bleiben bis 6 (Zurück) oder exit
    let backToMotor = false;
    while (!backToMotor) {
      console.log('\n┌────────────────────────────────────────────────────┐');
      console.log('│         BEFEHL AUSWÄHLEN (1-6)                     │');
      console.log('└────────────────────────────────────────────────────┘\n');
      console.log('  1. HOCH ⬆️');
      console.log('  2. RUNTER ⬇️');
      console.log('  3. STOP ⏹️');
      console.log('  4. LAMELLEN ÖFFNEN ☀️');
      console.log('  5. LAMELLEN SCHLIEẞEN 🌑');
      console.log('  6. ZURÜCK ZUM MOTOR-MENU 🔙\n');
      
      const actionChoice = await question('➜ Befehl eingeben (1-6): ');
      const actionIdx = parseInt(actionChoice);
      
      if (actionIdx === 6) {
        // Zurück zum Motormenu
        console.log('');
        backToMotor = true;
        continue;
      }
      
      if (isNaN(actionIdx) || actionIdx < 1 || actionIdx > 5) {
        console.log('\n❌ Ungültige Eingabe! Bitte 1, 2, 3, 4, 5 oder 6 eingeben.\n');
        continue;
      }
      
      // Befehl ausführen und bleiben im Menu
      await controlMotor(motorIdx, actionIdx);
      console.log('');
    }
  }
  
  console.log('\n👋 Auf Wiedersehen!\n');
  rl.close();
  process.exit(0);
}

main().catch(console.error);
