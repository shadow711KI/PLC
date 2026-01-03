// test-all-motors.js
// Testet alle 16 Motoren nacheinander und lässt sie runterfahren
// Du beobachtest, welcher Motor sich bewegt und notierst die Nummer!

import net from 'node:net';
import fs from 'node:fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const MOTOR_CONFIG = {
  1: { sps: 'SPS1', motorNr: 1, addr: [0x00, 0x00] },
  2: { sps: 'SPS1', motorNr: 2, addr: [0x01, 0x00] },
  3: { sps: 'SPS1', motorNr: 3, addr: [0x02, 0x00] },
  4: { sps: 'SPS1', motorNr: 4, addr: [0x03, 0x00] },
  5: { sps: 'SPS1', motorNr: 5, addr: [0x04, 0x00] },
  6: { sps: 'SPS1', motorNr: 6, addr: [0x05, 0x00] },
  7: { sps: 'SPS2', motorNr: 1, addr: [0x00, 0x00] },
  8: { sps: 'SPS2', motorNr: 2, addr: [0x01, 0x00] },
  9: { sps: 'SPS2', motorNr: 3, addr: [0x02, 0x00] },
  10: { sps: 'SPS2', motorNr: 4, addr: [0x03, 0x00] },
  11: { sps: 'SPS3', motorNr: 1, addr: [0x00, 0x00] },
  12: { sps: 'SPS3', motorNr: 2, addr: [0x01, 0x00] },
  13: { sps: 'SPS3', motorNr: 3, addr: [0x02, 0x00] },
  14: { sps: 'SPS3', motorNr: 4, addr: [0x03, 0x00] },
  15: { sps: 'SPS3', motorNr: 5, addr: [0x04, 0x00] },
  16: { sps: 'SPS3', motorNr: 6, addr: [0x05, 0x00] },
};

function buildFrame(addrLow, addrHigh, status = 0x02) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  const valueHigh = status;
  
  const payload = [TYP, 0x00, opCount, opcode, valueLow, valueHigh, addrLow, addrHigh];
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

console.log('\n=== TEST ALLE MOTOREN ===\n');
console.log('Dieser Test fährt jeden Motor RUNTER.');
console.log('Beobachte, welcher Motor sich bewegt!');
console.log('Notiere die Nummer des Motors, der "Arbeiten" steuert.\n');
console.log('-------------------------------------------\n');

let motorIndex = 0;

function testNextMotor() {
  if (motorIndex > 16) {
    console.log('\n=== TEST FERTIG ===\n');
    console.log('Welcher Motor war "Arbeiten"? Teile mir die Nummer mit!\n');
    return;
  }

  const config = MOTOR_CONFIG[motorIndex];
  if (!config) {
    motorIndex++;
    testNextMotor();
    return;
  }

  const spsConfig = spsMap[config.sps];
  const frame = buildFrame(config.addr[0], config.addr[1]);
  
  console.log(`[${motorIndex}] ${config.sps} Motor ${config.motorNr}: ${frame.toString('hex')}`);
  
  const sock = net.createConnection({ host: spsConfig.host, port: spsConfig.port }, () => {
    sock.write(frame);
  });

  let allResponses = '';

  sock.on('data', (buf) => {
    allResponses += buf.toString('hex');
  });

  sock.on('error', (e) => {
    console.log(`    Fehler: ${e.message}`);
    sock.destroy();
  });

  sock.on('close', () => {
    // Analyse der Responses
    if (allResponses.includes('1503')) {
      console.log(`    ✗ Nicht konfiguriert (Fehler 1503)`);
    } else if (allResponses.includes('0203400006')) {
      console.log(`    ✓ Konfiguriert und reagiert (RX: ${allResponses.substring(0, 20)}...)`);
    } else if (allResponses.length > 0) {
      console.log(`    ? Antwort: ${allResponses.substring(0, 20)}...`);
    } else {
      console.log(`    ! Keine Antwort`);
    }
    motorIndex++;
    setTimeout(() => testNextMotor(), 1000);  // 1 Sekunde zwischen Tests
  });
}

testNextMotor();
