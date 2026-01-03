// tcp-hex-station-test.js
// Testet verschiedene Station/Slave-IDs (0, 1, 2, 3, 4 etc.)

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

console.log('Teste verschiedene Station-IDs:\n');

const stations = [0, 1, 2, 3, 4, 5, 10, 255];
let testIndex = 0;

function testNext() {
  if (testIndex >= stations.length) {
    console.log('\nAlle Tests fertig!');
    return;
  }

  const station = stations[testIndex];
  const hex = buildFrame(station);
  
  console.log(`Station 0x${station.toString(16).padStart(2, '0')}:`);
  console.log(`  HEX: ${hex}`);

  const client = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    
    // Schaue auf RX-Station
    if (rxHex.length >= 6) {
      const rxStation = rxHex.substring(6, 8);
      console.log(`  → RX-Station: 0x${rxStation}`);
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
