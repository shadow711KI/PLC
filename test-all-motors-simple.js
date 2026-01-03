// test-all-motors-simple.js
// Testet alle 16 Motoren mit Timeout

import net from 'node:net';
import fs from 'fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const MOTORS = [
  { num: 1, sps: 'SPS1', addr: [0x00, 0x00] },
  { num: 2, sps: 'SPS1', addr: [0x01, 0x00] },
  { num: 3, sps: 'SPS1', addr: [0x02, 0x00] },
  { num: 4, sps: 'SPS1', addr: [0x03, 0x00] },
  { num: 5, sps: 'SPS1', addr: [0x04, 0x00] },
  { num: 6, sps: 'SPS1', addr: [0x05, 0x00] },
  { num: 7, sps: 'SPS2', addr: [0x00, 0x00] },
  { num: 8, sps: 'SPS2', addr: [0x01, 0x00] },
  { num: 9, sps: 'SPS2', addr: [0x02, 0x00] },
  { num: 10, sps: 'SPS2', addr: [0x03, 0x00] },
  { num: 11, sps: 'SPS3', addr: [0x00, 0x00] },
  { num: 12, sps: 'SPS3', addr: [0x01, 0x00] },
  { num: 13, sps: 'SPS3', addr: [0x02, 0x00] },
  { num: 14, sps: 'SPS3', addr: [0x03, 0x00] },
  { num: 15, sps: 'SPS3', addr: [0x04, 0x00] },
  { num: 16, sps: 'SPS3', addr: [0x05, 0x00] },
];

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

let idx = 0;

function testMotor() {
  if (idx >= MOTORS.length) {
    console.log('\n=== TEST FERTIG ===\n');
    return;
  }

  const motor = MOTORS[idx];
  const spsConfig = spsMap[motor.sps];
  const frame = buildFrame(motor.addr[0], motor.addr[1]);
  
  process.stdout.write(`[${motor.num}] ${motor.sps}: `);
  
  const sock = net.createConnection({ host: spsConfig.host, port: spsConfig.port });
  sock.setTimeout(2000);
  
  let responses = '';
  
  sock.on('connect', () => {
    sock.write(frame);
  });

  sock.on('data', (buf) => {
    responses += buf.toString('hex');
  });

  sock.on('timeout', () => {
    sock.destroy();
  });

  sock.on('error', (e) => {
    console.log(`FEHLER: ${e.message}`);
    idx++;
    setTimeout(testMotor, 500);
  });

  sock.on('close', () => {
    if (responses.includes('1503')) {
      console.log('✗ Fehler 1503 (nicht konfiguriert)');
    } else if (responses.includes('0203400006')) {
      console.log('✓ OK (konfiguriert)');
    } else if (responses.length > 0) {
      console.log(`? ${responses.substring(0, 20)}`);
    } else {
      console.log('! Keine Antwort');
    }
    idx++;
    setTimeout(testMotor, 500);
  });
}

testMotor();
