// map-addresses.js
// Findet die richtigen Adressen für jeden Motor

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

console.log('\n=== ADRESS-MAPPING ===\n');
console.log('Wir testen die RICHTIGEN Adressen!');
console.log('Für jede Adresse: Sag welcher PHYSISCHE Motor sich bewegt.\n');
console.log('(z.B. wenn Motor bei Low=0, High=1 runtergefahren wird, fährt "Wohnen_Ost" runter)');
console.log('(Dann ist: Low=0, High=1 = Wohnen_Ost)\n');
console.log('-------------------------------------------\n');

let results = {};

// Teste alle möglichen Adressen
const addressesToTest = [];
for (let low = 0; low <= 5; low++) {
  for (let high = 0; high <= 6; high++) {
    addressesToTest.push({ low, high });
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function testAllAddresses() {
  // Wähle eine SPS
  console.log('Welche SPS testen?');
  console.log('  1 = SPS1 (Wohnen)');
  console.log('  2 = SPS2 (Schlafen/Anna)');
  console.log('  3 = SPS3 (Bad/Ankleide)\n');
  
  let spsChoice = '';
  while (!['1', '2', '3'].includes(spsChoice)) {
    spsChoice = await askQuestion('Deine Wahl (1/2/3): ');
  }
  
  const spsNames = { '1': 'SPS1', '2': 'SPS2', '3': 'SPS3' };
  const spsName = spsNames[spsChoice];
  const spsData = spsMap[spsName];
  
  console.log(`\n✓ ${spsName} ausgewählt!\n`);
  console.log('Teste alle Adressen (jede läuft 3 Sekunden RUNTER)');
  console.log('Sag mir, welcher Motor sich bewegt!\n');
  console.log('-------------------------------------------\n');
  
  for (let idx = 0; idx < addressesToTest.length; idx++) {
    const addr = addressesToTest[idx];
    const frame = buildFrame(addr.low, addr.high, 0x02);  // RUNTER
    
    console.log(`[${idx + 1}/${addressesToTest.length}] Adressen: Low=${addr.low}, High=${addr.high}`);
    console.log(`       → Motor läuft 3 Sekunden RUNTER...`);
    
    const sock = net.createConnection({ host: spsData.host, port: spsData.port });
    sock.setTimeout(2000);
    
    sock.on('connect', () => {
      sock.write(frame);
    });

    sock.on('data', () => {});
    sock.on('timeout', () => { sock.destroy(); });
    sock.on('error', () => { sock.destroy(); });

    await new Promise((resolve) => {
      sock.on('close', () => {
        setTimeout(async () => {
          const motorName = await askQuestion(`       Welcher Motor? (oder leer wenn keiner): `);
          if (motorName.trim()) {
            results[`${addr.low},${addr.high}`] = motorName.trim();
            console.log(`       ✓ Gespeichert: Low=${addr.low}, High=${addr.high} → "${motorName}"`);
          } else {
            console.log(`       - Keine Bewegung`);
          }
          console.log('');
          resolve();
        }, 3000);
      });
    });
  }
  
  // Zeige Zusammenfassung
  console.log('\n=== ERGEBNIS ===\n');
  console.log(`Mapping für ${spsName}:\n`);
  for (const [addr, motor] of Object.entries(results)) {
    const [low, high] = addr.split(',');
    console.log(`  Low=${low}, High=${high} → "${motor}"`);
  }
  
  console.log('\nDies sind die RICHTIGEN Adressen!');
  console.log('Wir können jetzt addresses.json korrigieren.\n');
  
  rl.close();
}

testAllAddresses();
