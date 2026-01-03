// tcp-hex-arbeiten-test.js
// Testet Motor "Arbeiten" mit Adressen aus addresses.json

import net from 'node:net';
import fs from 'node:fs';

const map = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));
const motor = map.SPS1.motors.Arbeiten;

console.log('Motor Arbeiten aus addresses.json:');
console.log('  addrLow:', motor.addrLow.toString(16).padStart(2, '0'));
console.log('  addrHigh:', motor.addrHigh.toString(16).padStart(2, '0'));

// Hex-Befehle mit addrLow und addrHigh aus der Config bauen
function buildHex(status) {
  // 02 06 41 00 01 48 <status> <addrLow> <addrHigh> 03 <cksum> <cksum>
  const bytes = [0x02, 0x06, 0x41, 0x00, 0x01, 0x48, status, motor.addrLow, motor.addrHigh, 0x03];
  let sum = 0;
  for (let i = 2; i < 9; i++) sum += bytes[i];
  bytes.push(sum & 0xFF, (sum >> 8) & 0xFF);
  return Buffer.from(bytes).toString('hex');
}

const hexRunter = buildHex(0x02); // Status RUNTER
const hexHoch = buildHex(0x01);   // Status HOCH
const hexStop = buildHex(0x03);   // Status STOP

console.log('\nGenerierte Hex-Befehle:');
console.log('RUNTER:', hexRunter);
console.log('HOCH:', hexHoch);
console.log('STOP:', hexStop);

// === Test RUNTER ===
console.log('\n--- Test RUNTER ---');
const client1 = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
  console.log('Verbunden');
  client1.write(Buffer.from(hexRunter, 'hex'));
});
client1.on('data', (data) => {
  console.log('RX:', data.toString('hex'));
  client1.end();
});
client1.on('error', (err) => console.error('Fehler:', err.message));
client1.on('close', () => {
  setTimeout(() => testHoch(), 500);
});

// === Test HOCH ===
function testHoch() {
  console.log('\n--- Test HOCH ---');
  const client2 = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    console.log('Verbunden');
    client2.write(Buffer.from(hexHoch, 'hex'));
  });
  client2.on('data', (data) => {
    console.log('RX:', data.toString('hex'));
    client2.end();
  });
  client2.on('error', (err) => console.error('Fehler:', err.message));
  client2.on('close', () => {
    setTimeout(() => testStop(), 500);
  });
}

// === Test STOP ===
function testStop() {
  console.log('\n--- Test STOP ---');
  const client3 = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    console.log('Verbunden');
    client3.write(Buffer.from(hexStop, 'hex'));
  });
  client3.on('data', (data) => {
    console.log('RX:', data.toString('hex'));
    client3.end();
  });
  client3.on('error', (err) => console.error('Fehler:', err.message));
  client3.on('close', () => {
    console.log('\nTeste fertig!');
  });
}
