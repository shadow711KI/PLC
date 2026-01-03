const net = require('net');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Testing ALL MOTORS with CORRECTED SEQUENTIAL ADDRESSES  ║');
console.log('║  (Wohnen_Ost: 0x00, Sued_l: 0x01, Sued_r: 0x02, etc)     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function calculateChecksum(data) {
  let sum = 0;
  for (let byte of data) {
    sum += byte;
  }
  return sum & 0xFF;
}

function buildFrame(addrLow, status) {
  const statusMap = { 'RUNTER': 0x02, 'HOCH': 0x01, 'STOP': 0x03 };
  const frame = Buffer.from([
    0x02, // STX
    0x08, // Länge
    0x41, // Typ
    0x00, // BEF_LOW
    0x00, // BEF_HIGH
    0x01, // OpCount
    0x48, // OpCode
    addrLow, // Adresse Low
    0x00, // Adresse High
    statusMap[status], // Status/Befehl
    0x03  // ETX
  ]);
  
  return Buffer.concat([frame, Buffer.from([calculateChecksum(frame)])]);
}

async function testAllMotors() {
  const motors = Object.entries(config.SPS1.motors);
  
  for (const [name, motor] of motors) {
    await new Promise((resolve) => {
      const socket = net.createConnection(
        { host: config.SPS1.host, port: config.SPS1.port },
        () => {
          const frame = buildFrame(motor.addrLow, 'RUNTER');
          console.log(`\n${name} (Adresse: 0x${motor.addrLow.toString(16).padStart(2, '0')})`);
          console.log(`  Frame: ${frame.toString('hex')}`);
          console.log(`  ➜ Befehl RUNTER gesendet...`);
          
          socket.write(frame);
          
          let dataReceived = false;
          socket.on('data', (data) => {
            if (!dataReceived) {
              console.log(`  📨 Response: ${data.toString('hex')}`);
              dataReceived = true;
            }
          });
          
          setTimeout(() => {
            socket.destroy();
            resolve();
          }, 800);
        }
      );
      
      socket.on('error', (err) => {
        console.error(`  ❌ Fehler: ${err.message}`);
        resolve();
      });
    });
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✓ Alle Motoren getestet                                   ║');
  console.log('║  Beobachtung: Welche Motoren bewegen sich?                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

testAllMotors().catch(console.error);
