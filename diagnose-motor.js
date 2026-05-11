// diagnose-motor.js
// Fragt die Motorposition ab und zeigt den Status

import net from 'node:net';

const motorNum = parseInt(process.argv[2]) || 6;
const HOST = '192.168.178.234';
const PORT = 1001;
const STATION = 0x00;

// Motoradressen für Status-Abfrage (Operandencode 0x48)
// Aus der Adressenliste: Motor 6 hat Adressen 0x05 (3=position oben, 4=position unten)
const MOTOR_STATUS_ADDRESSES = {
  1: [0x03, 0x00, 0x04, 0x00],  // Motor 1: 3=oben, 4=unten
  2: [0x13, 0x00, 0x14, 0x00],  // Motor 2: 0x13, 0x14
  3: [0x23, 0x00, 0x24, 0x00],  // Motor 3: 0x23, 0x24
  4: [0x33, 0x00, 0x34, 0x00],  // Motor 4: 0x33, 0x34
  5: [0x43, 0x00, 0x44, 0x00],  // Motor 5: 0x43, 0x44
  6: [0x53, 0x00, 0x54, 0x00],  // Motor 6: 0x53, 0x54 (Position oben, Position unten)
};

if (!MOTOR_STATUS_ADDRESSES[motorNum]) {
  console.error(`Fehler: Motor ${motorNum} nicht definiert`);
  process.exit(1);
}

const [addrOben, addrObenHi, addrUnten, addrUntenHi] = MOTOR_STATUS_ADDRESSES[motorNum];

function buildFrame(addrLow, addrHigh) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const opCount = 0x01;
  const opcode = 0x48;  // BYTE-Status
  
  const payload = [TYP, STATION, opCount, opcode, addrLow, addrHigh];
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

console.log(`\n=== Diagnose Motor ${motorNum} ===\n`);

function diagnose(name, addrLow, addrHigh) {
  return new Promise((resolve) => {
    const frame = buildFrame(addrLow, addrHigh);
    const sock = net.createConnection({ host: HOST, port: PORT }, () => {
      console.log(`${name}:`);
      console.log(`  TX: ${frame.toString('hex')}`);
      sock.write(frame);
    });

    sock.on('data', (buf) => {
      const hex = buf.toString('hex');
      console.log(`  RX: ${hex}`);
      
      // Parse Antwort
      if (hex.startsWith('0203')) {
        const statusByte = hex.substring(8, 10);
        console.log(`  Status: 0x${statusByte} (${parseInt(statusByte, 16)} = ${parseInt(statusByte, 16) > 50 ? 'aktiv' : 'inaktiv'})`);
      }
      
      sock.end();
    });

    sock.on('error', (e) => {
      console.log(`  Fehler: ${e.message}`);
      resolve();
    });

    sock.on('close', resolve);
  });
}

(async () => {
  await diagnose('Position oben (0x53)', addrOben, addrObenHi);
  await new Promise(r => setTimeout(r, 500));
  
  await diagnose('Position unten (0x54)', addrUnten, addrUntenHi);
  
  console.log('\nFertig.\n');
})();
// [EXPERIMENTELL/DIAGNOSE] Motorstatus-Abfrage
