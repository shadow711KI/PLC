const net = require('net');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
const motor = config.SPS1.motors.Wohnen_Ost;

function sendFrame(frameData, description) {
  return new Promise((resolve) => {
    const frame = Buffer.from(frameData);
    
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
  console.log('║  Test: Spezielle Beschattungsfahrt-Sequenz (OpCode 0x69)║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Fahre Motor runter
  console.log('\n1️⃣  Fahre Motor RUNTER...');
  const frame1 = [
    0x02, 0x08, 0x41, 0x00, 0x01, 0x01, 0x48,
    0x02, motor.addrLow, 1,
    0x03, 0x8e, 0x00
  ];
  
  const sock1 = net.createConnection(
    { host: config.SPS1.host, port: config.SPS1.port },
    () => {
      sock1.write(Buffer.from(frame1));
      setTimeout(() => sock1.destroy(), 600);
    }
  );
  
  await new Promise(r => setTimeout(r, 1500));
  
  // Spezielle Beschattungsfahrt-Sequenz mit OpCode 0x69
  console.log('\n2️⃣  Sende Beschattungsfahrt-Sequenz (OpCode 0x69)...');
  
  // Standard sequence: 02 09 41 00 01 01 69 0F 00 00 00 03 BB 00 BB
  // Angepasst für unsere Adresse
  const frame2 = [
    0x02, 0x09, 0x41, 0x00, 0x01, 0x01, 0x69,
    0x0F, 0x00, 0x00, 0x00,
    0x03  // ETX
  ];
  
  // Checksum berechnen
  let sum = 0;
  for (let i = 2; i < frame2.length; i++) {
    sum += frame2[i];
  }
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  frame2.push(ckLow, ckHigh);
  
  await sendFrame(frame2, '  Spezialbefehl mit OpCode 0x69');
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Beobachtung: Stoppt der Motor jetzt?                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  process.exit(0);
})();
