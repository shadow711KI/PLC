// test-motors-correct.js
// Testet alle Motoren mit den RICHTIGEN Adressen aus addresses.json

import net from 'node:net';
import fs from 'fs';

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

console.log('\n=== TEST ALLE MOTOREN (KORREKTE ADRESSEN) ===\n');

let motorList = [];

// Sammle alle Motoren aus addresses.json
for (const [spsName, spsData] of Object.entries(spsMap)) {
  if (spsData.motors) {
    for (const [motorName, motorData] of Object.entries(spsData.motors)) {
      motorList.push({
        name: motorName,
        spsName: spsName,
        spsData: spsData,
        addrLow: motorData.addrLow,
        addrHigh: motorData.addrHigh
      });
    }
  }
}

console.log(`Teste ${motorList.length} Motoren:\n`);

let idx = 0;

function testMotor() {
  if (idx >= motorList.length) {
    console.log('\n=== TEST FERTIG ===\n');
    return;
  }

  const motor = motorList[idx];
  const frame = buildFrame(motor.addrLow, motor.addrHigh);
  
  process.stdout.write(`[${motor.spsName}] ${motor.name}: `);
  
  const sock = net.createConnection({ host: motor.spsData.host, port: motor.spsData.port });
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
    console.log(`ERROR`);
    idx++;
    setTimeout(testMotor, 500);
  });

  sock.on('close', () => {
    if (responses.includes('1503')) {
      console.log('✗ Fehler 1503');
    } else if (responses.includes('0203400006') || responses.includes('0203400021')) {
      console.log('✓ OK');
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
