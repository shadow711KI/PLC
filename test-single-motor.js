// test-single-motor.js
// Testet Motor 6 (Arbeiten) mehrfach mit verschiedenen Befehlen

import net from 'node:net';
import fs from 'node:fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

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

const motorNum = 6;  // Motor 6 = Arbeiten
const spsConfig = spsMap.SPS1;
const addrLow = 0x05;   // Motor 6 Adresse
const addrHigh = 0x00;

console.log('\n=== TEST MOTOR 6 (Arbeiten) ===\n');
console.log(`Ziel: ${spsConfig.host}:${spsConfig.port}\n`);

const tests = [
  { cmd: 'RUNTER', status: 0x02, desc: 'Motor runterfahren' },
  { cmd: 'STOP', status: 0x03, desc: 'Motor STOP' },
  { cmd: 'HOCH', status: 0x01, desc: 'Motor hochfahren' },
  { cmd: 'STOP', status: 0x03, desc: 'Motor nochmal STOP' },
];

let testIndex = 0;

function runTest() {
  if (testIndex >= tests.length) {
    console.log('\n=== TEST FERTIG ===\n');
    console.log('Hat sich Motor 6 BEWEGT? JA oder NEIN?\n');
    return;
  }

  const test = tests[testIndex];
  const frame = buildFrame(addrLow, addrHigh, test.status);
  
  console.log(`[${testIndex + 1}] ${test.cmd} (${test.desc})`);
  console.log(`    TX: ${frame.toString('hex')}`);
  
  const sock = net.createConnection({ host: spsConfig.host, port: spsConfig.port }, () => {
    sock.write(frame);
  });

  let responseData = '';
  sock.on('data', (buf) => {
    responseData += buf.toString('hex');
    console.log(`    RX: ${buf.toString('hex')}`);
  });

  sock.on('error', (e) => {
    console.log(`    Fehler: ${e.message}`);
  });

  sock.on('close', () => {
    testIndex++;
    console.log('');
    setTimeout(() => runTest(), 2000);  // 2 Sekunden zwischen Tests
  });

  sock.on('timeout', () => {
    sock.destroy();
  });
}

runTest();
