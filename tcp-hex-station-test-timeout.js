// tcp-hex-station-test-timeout.js
// Testet verschiedene Station-IDs mit Timeout

import net from 'node:net';

function buildFrame(station) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const opcode = 0x48, status = 0x02;
  const addrLow = 0x00, addrHigh = 0x06;
  const opCount = 0x01;
  
  const payload = [TYP, station, opCount, opcode, status, addrLow, addrHigh];
  const len = payload.length + 1;
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

console.log('Teste verschiedene Station-IDs mit Timeout:\n');

const stations = [0, 1, 2, 3, 4, 5];
let testIndex = 0;
const TIMEOUT = 2000; // 2 Sekunden Timeout

function testNext() {
  if (testIndex >= stations.length) {
    console.log('\nAlle Tests fertig!');
    process.exit(0);
  }

  const station = stations[testIndex];
  const hex = buildFrame(station);
  
  console.log(`[${testIndex + 1}/${stations.length}] Station 0x${station.toString(16).padStart(2, '0')}:`);
  console.log(`  HEX: ${hex}`);

  let timeoutHandle;
  const client = net.createConnection({ host: '192.168.178.234', port: 1001 });
  
  timeoutHandle = setTimeout(() => {
    console.log(`  → TIMEOUT (keine Antwort nach ${TIMEOUT}ms)`);
    client.destroy();
    testIndex++;
    setTimeout(() => testNext(), 500);
  }, TIMEOUT);

  client.on('connect', () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    clearTimeout(timeoutHandle);
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    console.log();
    
    client.end();
  });

  client.on('error', (err) => {
    clearTimeout(timeoutHandle);
    console.log(`  → Verbindungsfehler: ${err.message}`);
    console.log();
    testIndex++;
    setTimeout(() => testNext(), 500);
  });

  client.on('close', () => {
    clearTimeout(timeoutHandle);
    if (testIndex < stations.length - 1) {
      testIndex++;
      setTimeout(() => testNext(), 500);
    }
  });
}

testNext();
