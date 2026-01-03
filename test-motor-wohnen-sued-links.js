// test-motor-wohnen-sued-links.js
// Testet Motor 2 "Wohnen Süd links" auf SPS1

import net from 'node:net';
import fs from 'node:fs';

const map = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const CSE_HOST = '192.168.178.234';
const CSE_PORT = 1001;
const STATION = 0;

console.log(`Test: Wohnen Süd links (Motor 2) auf ${CSE_HOST}:${CSE_PORT}`);

function checksumLE(frameNoCksum) {
  const etxIdx = frameNoCksum.indexOf(0x03);
  if (etxIdx < 0) throw new Error('ETX (0x03) nicht gefunden');
  const start = 2;
  let sum = 0;
  for (let i = start; i < etxIdx; i++) sum = (sum + frameNoCksum[i]) & 0xFFFF;
  return [sum & 0xFF, (sum >> 8) & 0xFF];
}

function buildFrame({ operands }) {
  const STX = 0x02, ETX = 0x03, TYP_AB = 0x41;
  
  const payload = [TYP_AB, STATION, operands.length];
  for (const op of operands) {
    payload.push(op.code, op.addrLow, op.addrHigh);
    if (op.status !== undefined) payload.push(op.status);
  }
  
  const len = payload.length + 1;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  const [ckL, ckH] = checksumLE(frameNoCksum);
  return [...frameNoCksum, ckL, ckH];
}

// Motor 2 Adressen (aus Adresstabelle)
function frameMotorHoch() {
  return buildFrame({ operands: [{ code: 0x48, addrLow: 0x12, addrHigh: 0x00, status: 0x01 }] });
}

function frameMotorRunter() {
  return buildFrame({ operands: [{ code: 0x48, addrLow: 0x22, addrHigh: 0x00, status: 0x02 }] });
}

function frameMotorStop() {
  return buildFrame({ operands: [{ code: 0x48, addrLow: 0x2D, addrHigh: 0x00, status: 0x03 }] });
}

const sock = net.createConnection({ host: CSE_HOST, port: CSE_PORT }, () => {
  console.log(`✓ Verbunden zu ${CSE_HOST}:${CSE_PORT}\n`);

  // Automatik ausschalten
  const auto = buildFrame({ operands: [{ code: 0x69, addrLow: 0x26, addrHigh: 0x00, status: 0x01 }] });
  console.log('TX auto aus:', Buffer.from(auto).toString('hex'));
  sock.write(Buffer.from(auto));

  setTimeout(() => {
    // Hoch fahren
    const hoch = frameMotorHoch();
    console.log('TX hoch   :', Buffer.from(hoch).toString('hex'));
    sock.write(Buffer.from(hoch));

    setTimeout(() => {
      // Stop
      const stop = frameMotorStop();
      console.log('TX stop   :', Buffer.from(stop).toString('hex'));
      sock.write(Buffer.from(stop));

      setTimeout(() => {
        // Runter fahren
        const runter = frameMotorRunter();
        console.log('TX runter :', Buffer.from(runter).toString('hex'));
        sock.write(Buffer.from(runter));

        setTimeout(() => {
          // Stop
          const stop2 = frameMotorStop();
          console.log('TX stop   :', Buffer.from(stop2).toString('hex'));
          sock.write(Buffer.from(stop2));
        }, 1500);
      }, 1500);
    }, 1500);
  }, 500);
});

sock.on('data', (buf) => {
  console.log('RX       :', buf.toString('hex'));
});

sock.on('error', (e) => {
  console.error('❌ Fehler:', e.message);
});

sock.on('close', () => {
  console.log('\nTest beendet');
});
