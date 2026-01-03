// find-6-motors.js
// Findet die 6 unterschiedlichen Motoren auf SPS1
// Testet systematisch und prüft, wann sich EIN neuer Motor bewegt

import net from 'node:net';
import fs from 'fs';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const spsData = spsMap.SPS1;
const testedAddresses = [];
const motorAddresses = [];

console.log('\n=== FINDE 6 MOTOREN ===\n');
console.log('Ich teste Adressen nacheinander.');
console.log('Du sagst: "j" wenn sich ein NEUER Motor bewegt, "n" wenn gleicher wie zuvor.\n');
console.log('-------------------------------------------\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  // Teste systematisch
  for (let low = 0; low <= 5; low++) {
    for (let high = 0; high <= 6; high++) {
      const frame = buildFrame(low, high, 0x02);
      
      console.log(`\nAdresse: Low=${low}, High=${high}`);
      console.log('  Motor läuft 3 Sekunden RUNTER...');
      
      await new Promise((resolve) => {
        const sock = net.createConnection({ host: spsData.host, port: spsData.port });
        sock.setTimeout(2000);
        
        sock.on('connect', () => {
          sock.write(frame);
        });

        sock.on('data', () => {});
        sock.on('timeout', () => { sock.destroy(); });
        sock.on('error', () => { sock.destroy(); });

        sock.on('close', () => {
          setTimeout(async () => {
            const answer = await askQuestion('  Neuer Motor? (j/n): ');
            if (answer === 'j') {
              motorAddresses.push({ low, high });
              console.log(`  ✓ Motor ${motorAddresses.length} gefunden!`);
              
              // Wenn 6 Motoren gefunden, stop
              if (motorAddresses.length >= 6) {
                console.log('\n=== 6 MOTOREN GEFUNDEN! ===\n');
                showResults();
                rl.close();
                return;
              }
            }
            resolve();
          }, 3000);
        });
      });
    }
  }
  
  console.log('\n=== ABGESCHLOSSEN ===\n');
  showResults();
  rl.close();
}

function showResults() {
  console.log('Motoren gefunden:\n');
  motorAddresses.forEach((addr, idx) => {
    console.log(`Motor ${idx + 1}: addrLow=${addr.low}, addrHigh=${addr.high}`);
  });
  console.log('');
}

main();
