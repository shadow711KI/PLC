// test-all-addresses-sps1.js
// Testet ALLE Adressen auf SPS1 und zeigt welche funktionieren

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

const spsData = spsMap.SPS1;
const results = [];

console.log('\n=== TEST ALLE ADRESSEN AUF SPS1 ===\n');
console.log('Teste alle möglichen Kombinationen (Low 0-5, High 0-6)...\n');

let tested = 0;
let found = 0;

async function testAddress(low, high) {
  return new Promise((resolve) => {
    const frame = buildFrame(low, high, 0x02);
    
    const sock = net.createConnection({ host: spsData.host, port: spsData.port });
    sock.setTimeout(1000);
    
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

    sock.on('error', () => {
      sock.destroy();
    });

    sock.on('close', () => {
      tested++;
      // Prüfe: funktioniert diese Adresse?
      if (responses.includes('0203400006') || responses.includes('0203400021')) {
        found++;
        results.push({ low, high });
        console.log(`✓ [${tested}/42] Low=${low}, High=${high} → FUNKTIONIERT!`);
      } else if (responses.includes('1503')) {
        // Fehler 1503 = ungültige Adresse
      } else {
        // Keine Antwort
      }
      resolve();
    });
  });
}

async function main() {
  // Teste ALLE Kombinationen
  for (let low = 0; low <= 5; low++) {
    for (let high = 0; high <= 6; high++) {
      await testAddress(low, high);
    }
  }
  
  console.log(`\n=== ERGEBNIS ===\n`);
  console.log(`Gefundene Adressen auf SPS1: ${found}\n`);
  
  results.forEach((r, idx) => {
    console.log(`Motor ${idx + 1}: addrLow=${r.low}, addrHigh=${r.high}`);
  });
  
  if (found > 0) {
    console.log('\nKopiere diese Adressen in addresses.json!\n');
  }
}

main();
