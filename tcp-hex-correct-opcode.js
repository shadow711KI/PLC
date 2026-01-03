// tcp-hex-correct-opcode.js
// Nutzt den RICHTIGEN Operand-Code aus der Dokumentation

import net from 'node:net';

function buildFrame(status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const station = 0x00, opCount = 0x01;
  const opcode = 0x01;  // ← OpCode 0x01
  const valueLow = 0x48;  // ← Immer 0x48 für Motor-Befehle
  const valueHigh = status;  // ← Status (0x01=HOCH, 0x02=RUNTER, 0x03=STOP)
  const addrLow = 0x05, addrHigh = 0x00;  // ← Motor 6 "Arbeiten"
  
  const payload = [TYP, station, opCount, opcode, valueLow, valueHigh, addrLow, addrHigh];
  const len = payload.length;  // Nicht +1!
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  const frame = [...frameNoCksum, ckLow, ckHigh];
  return Buffer.from(frame).toString('hex');
}

console.log('Teste MOTOR "Arbeiten" (Motor 6) mit korrekten Adressen:\n');

const tests = [
  { status: 0x01, name: 'HOCH (Status 0x01)' },
  { status: 0x02, name: 'RUNTER (Status 0x02)' },
  { status: 0x03, name: 'STOP (Status 0x03)' },
];

let testIndex = 0;

function testNext() {
  if (testIndex >= tests.length) {
    console.log('\nAlle Tests fertig!');
    return;
  }

  const test = tests[testIndex];
  const hex = buildFrame(test.status);
  
  console.log(`${test.name}:`);
  console.log(`  HEX: ${hex}`);

  const client = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    
    if (rxHex.startsWith('020440001502') || rxHex.startsWith('020440001501')) {
      console.log(`  → Noch Fehler`);
    } else {
      console.log(`  → ✓ NEUE ANTWORT!`);
    }
    console.log();
    
    client.end();
  });

  client.on('error', (err) => {
    console.log(`  Fehler: ${err.message}\n`);
  });

  client.on('close', () => {
    testIndex++;
    setTimeout(() => testNext(), 500);
  });
}

testNext();
