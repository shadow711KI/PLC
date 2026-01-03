// find-all-addresses.js
// Findet ALLE konfigurierten Motoren auf einer SPS durch systematisches Testen

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

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function testSPS() {
  console.log('\n=== ADRESS-FINDER ===\n');
  
  // Wähle SPS
  console.log('Welche SPS?');
  console.log('  1 = SPS1');
  console.log('  2 = SPS2');
  console.log('  3 = SPS3\n');
  
  let spsChoice = '';
  while (!['1', '2', '3'].includes(spsChoice)) {
    spsChoice = await askQuestion('Wahl (1/2/3): ');
  }
  
  const spsNames = { '1': 'SPS1', '2': 'SPS2', '3': 'SPS3' };
  const spsName = spsNames[spsChoice];
  const spsData = spsMap[spsName];
  
  console.log(`\n✓ ${spsName} (${spsData.host}:${spsData.port})\n`);
  console.log('Teste ALLE möglichen Adressen...\n');
  
  const results = [];
  
  // Teste ALLE Adressen: Low 0-5, High 0-6
  for (let low = 0; low <= 5; low++) {
    for (let high = 0; high <= 6; high++) {
      const frame = buildFrame(low, high, 0x02);  // RUNTER
      
      await new Promise((resolve) => {
        const sock = net.createConnection({ host: spsData.host, port: spsData.port });
        sock.setTimeout(1500);
        
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
          // Prüfe: funktioniert diese Adresse?
          if (responses.includes('0203400006') || responses.includes('0203400021')) {
            results.push({ low, high });
            console.log(`✓ Low=${low}, High=${high} → FUNKTIONIERT!`);
          }
          resolve();
        });
      });
    }
  }
  
  // Zeige Ergebnisse
  console.log(`\n=== ERGEBNIS FÜR ${spsName} ===\n`);
  console.log(`${results.length} Motoren gefunden:\n`);
  
  results.forEach((r, idx) => {
    console.log(`Motor ${idx + 1}: Low=${r.low}, High=${r.high}`);
  });
  
  console.log('\nKopiere diese Adressen in addresses.json!\n');
  
  rl.close();
}

testSPS();
