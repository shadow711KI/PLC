// tcp-hex-correct-length.js
// Testet mit korrekter Frame-Länge (08 statt 06)

import net from 'node:net';

function buildHex(opcode, status, addrLow, addrHigh) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const station = 0x00, opCount = 0x01;
  
  // Frame: STX | Länge | Typ | Station | OpCount | OpCode | Status | AddrLow | AddrHigh | ETX
  const payload = [TYP, station, opCount, opcode, status, addrLow, addrHigh];
  const len = payload.length + 1; // +1 für ETX
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

console.log('Teste mit KORREKTER Frame-Länge 08:\n');

const tests = [
  { opcode: 0x48, status: 0x02, addrLow: 0x00, addrHigh: 0x06, name: 'RUNTER' },
  { opcode: 0x48, status: 0x01, addrLow: 0x00, addrHigh: 0x06, name: 'HOCH' },
  { opcode: 0x48, status: 0x03, addrLow: 0x00, addrHigh: 0x06, name: 'STOP' },
];

let testIndex = 0;

function testNext() {
  if (testIndex >= tests.length) {
    console.log('\nAlle Tests fertig!');
    return;
  }

  const test = tests[testIndex];
  const hex = buildHex(test.opcode, test.status, test.addrLow, test.addrHigh);
  
  console.log(`${test.name}:`);
  console.log(`  HEX: ${hex}`);

  const client = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    
    if (rxHex.startsWith('020440001502')) {
      console.log(`  → Noch immer Fehler 0x15`);
    } else if (rxHex.startsWith('02044000')) {
      const status = rxHex.substring(8, 10);
      console.log(`  → Fehler 0x${status}`);
    } else {
      console.log(`  → Möglicherweise Erfolg!`);
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
