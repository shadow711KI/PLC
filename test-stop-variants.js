const net = require('net');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
const motor = config.SPS1.motors.Wohnen_Ost;

function buildFrame(status, addrLow, addrHigh) {
  const frame = Buffer.from([
    0x02, 0x08, 0x41, 0x00, 0x01, 0x01, 0x48,
    status, addrLow, addrHigh
  ]);
  
  let sum = 0;
  for (let i = 2; i < frame.length; i++) {
    sum += frame[i];
  }
  return Buffer.concat([frame, Buffer.from([0x03, sum & 0xFF, (sum >> 8) & 0xFF])]);
}

async function testStop(description, status, addrLow, addrHigh) {
  return new Promise((resolve) => {
    const frame = buildFrame(status, addrLow, addrHigh);
    
    console.log(`\n${description}`);
    console.log(`  Frame: ${frame.toString('hex')}`);
    
    const sock = net.createConnection(
      { host: config.SPS1.host, port: config.SPS1.port },
      () => {
        let responses = '';
        sock.on('data', (data) => {
          responses += data.toString('hex');
          console.log(`  RX: ${data.toString('hex')}`);
        });
        
        sock.write(frame);
        setTimeout(() => {
          if (responses.includes('0203400006') || responses.includes('0203400021')) {
            console.log('  ✅ Akzeptiert');
          }
          sock.destroy();
          resolve();
        }, 600);
      }
    );
    
    sock.on('error', () => resolve());
  });
}

(async () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Test verschiedene STOP-Varianten                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Zuerst Motor runterfahren
  console.log('\n1️⃣  Fahre Motor RUNTER...');
  const frame1 = buildFrame(0x02, motor.addrLow, 1);
  const sock1 = net.createConnection(
    { host: config.SPS1.host, port: config.SPS1.port },
    () => {
      sock1.write(frame1);
      setTimeout(() => sock1.destroy(), 600);
    }
  );
  
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('\n2️⃣  Teste verschiedene STOP-Kommandos:');
  
  // Standard STOP (0x03)
  await testStop('  A) STOP 0x03 mit addrHigh=1', 0x03, motor.addrLow, 1);
  await new Promise(r => setTimeout(r, 500));
  
  // STOP mit addrHigh=0
  await testStop('  B) STOP 0x03 mit addrHigh=0', 0x03, motor.addrLow, 0);
  await new Promise(r => setTimeout(r, 500));
  
  // Versuche RUNTER nochmal (0x02 könnte auch stoppen)
  await testStop('  C) RUNTER 0x02 nochmal (evtl. toggles)', 0x02, motor.addrLow, 1);
  await new Promise(r => setTimeout(r, 500));
  
  // Versuche HOCH (0x01) um zu stoppen
  await testStop('  D) HOCH 0x01 (evtl. entgegengesetzt = stop)', 0x01, motor.addrLow, 0);
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Beobachtung: Welcher Befehl stoppt den Motor?       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  process.exit(0);
})();
