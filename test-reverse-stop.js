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

async function sendCommand(status, description) {
  return new Promise((resolve) => {
    const frame = buildFrame(status, motor.addrLow, 1);
    
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
  console.log('║  Test: RUNTER → Kurze Pause → HOCH (Bremse!)        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Fahre runter
  await sendCommand(0x02, '1️⃣  Motor RUNTER fahren...');
  
  // Warte 2 Sekunden
  console.log('\n⏳  Warte 2 Sekunden...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Sende HOCH (entgegengesetzt)
  await sendCommand(0x01, '2️⃣  Sende HOCH (entgegengesetzt) - sollte Bremse sein');
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Beobachtung: Stoppt der Motor mit Gegenrichtung?    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  process.exit(0);
})();
