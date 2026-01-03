// identify-motors.js
// Testet ALLE Motoren mit EINEM Befehl
// Erst Befehl wählen, dann für jeden Motor j/n eingeben

import net from 'node:net';
import fs from 'fs';
import readline from 'readline';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

function buildFrame(addrLow, addrHigh, status) {
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

const STATUS_CODES = {
  '1': { code: 0x01, name: 'HOCH' },
  '2': { code: 0x02, name: 'RUNTER' },
  '3': { code: 0x03, name: 'STOP' }
};

let motorList = [];
let results = [];
let selectedStatus = null;

// Sammle alle Motoren
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

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n=== MOTOR-IDENTIFIKATION ===\n');
  
  // Schritt 1: Befehl auswählen
  console.log('Wähle einen Befehl:');
  console.log('  1 = HOCH');
  console.log('  2 = RUNTER');
  console.log('  3 = STOP\n');
  
  let choice = '';
  while (!STATUS_CODES[choice]) {
    choice = await askQuestion('Deine Wahl (1/2/3): ');
    if (!STATUS_CODES[choice]) {
      console.log('⚠️  Ungültige Eingabe! Bitte 1, 2 oder 3 eingeben.\n');
    }
  }
  
  selectedStatus = STATUS_CODES[choice];
  console.log(`\n✓ Befehl ausgewählt: ${selectedStatus.name}\n`);
  console.log('-------------------------------------------\n');
  console.log('Jetzt testen wir alle Motoren mit Befehl: ' + selectedStatus.name);
  console.log('Jeder Motor läuft 3 Sekunden.');
  console.log('Drücke "j" wenn er sich bewegt, "n" wenn nicht.\n');
  
  // Schritt 2: Jeden Motor testen
  await testAllMotors();
  
  // Schritt 3: Ergebnisse anzeigen
  showResults();
  
  rl.close();
}

async function testAllMotors() {
  for (let idx = 0; idx < motorList.length; idx++) {
    const motor = motorList[idx];
    const frame = buildFrame(motor.addrLow, motor.addrHigh, selectedStatus.code);
    
    console.log(`[${idx + 1}/${motorList.length}] ${motor.spsName} → "${motor.name}"`);
    console.log(`       Adressen: Low=${motor.addrLow}, High=${motor.addrHigh}`);
    console.log(`       → Motor fährt 3 Sekunden ${selectedStatus.name}...`);
    
    const sock = net.createConnection({ host: motor.spsData.host, port: motor.spsData.port });
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
          const answer = await askQuestion(`       Funktioniert? (j/n): `);
          const works = answer.toLowerCase() === 'j';
          results.push({
            name: motor.name,
            spsName: motor.spsName,
            works: works
          });
          console.log('');
          resolve();
        }, 3000);
      });
    });
  }
}

function showResults() {
  console.log('\n=== ERGEBNISSE ===\n');
  console.log(`Befehl: ${selectedStatus.name}\n`);
  
  console.log('✓ FUNKTIONIERT (diese Motoren bewegen sich):');
  const working = results.filter(r => r.works);
  if (working.length === 0) {
    console.log('  (keine)');
  } else {
    working.forEach(r => {
      console.log(`  ${r.spsName}: "${r.name}"`);
    });
  }
  
  console.log('\n✗ FUNKTIONIERT NICHT:');
  const notWorking = results.filter(r => !r.works);
  if (notWorking.length === 0) {
    console.log('  (alle funktionieren!)');
  } else {
    notWorking.forEach(r => {
      console.log(`  ${r.spsName}: "${r.name}"`);
    });
  }
  
  console.log('\n');
}

main();
