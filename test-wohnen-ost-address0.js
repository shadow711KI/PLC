const net = require('net');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
const motor = config.SPS1.motors.Wohnen_Ost;

console.log('╔═════════════════════════════════════════════════╗');
console.log('║  Testing Wohnen_Ost with CORRECTED address 0x00 ║');
console.log('╚═════════════════════════════════════════════════╝\n');

function calculateChecksum(data) {
  let sum = 0;
  for (let byte of data) {
    sum += byte;
  }
  return sum & 0xFF;
}

function buildFrame(status) {
  const statusMap = { 'RUNTER': 0x02, 'HOCH': 0x01, 'STOP': 0x03 };
  const frame = Buffer.from([
    0x02, // STX
    0x08, // Länge
    0x41, // Typ
    0x00, // BEF_LOW
    0x00, // BEF_HIGH
    0x01, // OpCount
    0x48, // OpCode (0x48 für Motor)
    motor.addrLow, // Adresse Low (KORRIGIERT: jetzt 0x00)
    motor.addrHigh, // Adresse High
    statusMap[status], // Status/Befehl
    0x03  // ETX
  ]);
  
  const checksum = calculateChecksum(frame);
  return Buffer.concat([frame, Buffer.from([checksum])]);
}

function sendCommand(socket, command, description) {
  return new Promise((resolve) => {
    const frame = buildFrame(command);
    console.log(`\n${description}:`);
    console.log(`  Frame: ${frame.toString('hex')}`);
    console.log(`  Motor Address: 0x${motor.addrLow.toString(16).padStart(2, '0')} (${motor.addrLow})`);
    
    socket.write(frame, () => {
      console.log(`  ✓ Befehl gesendet`);
    });
    
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

const socket = net.createConnection(
  { host: config.SPS1.host, port: config.SPS1.port },
  async () => {
    console.log(`✓ Verbunden mit SPS1 (${config.SPS1.host}:${config.SPS1.port})\n`);
    
    let responseCount = 0;
    socket.on('data', (data) => {
      responseCount++;
      console.log(`\n  📨 Response ${responseCount}: ${data.toString('hex')}`);
      if (data[0] === 0x02 && data[data.length - 1] === 0x03) {
        console.log(`  ✅ SPS antwortet korrekt`);
      }
    });
    
    // Test sequence
    await sendCommand(socket, 'RUNTER', '1️⃣  Befehl: RUNTER (abwärts)');
    await new Promise(r => setTimeout(r, 1000));
    
    await sendCommand(socket, 'HOCH', '2️⃣  Befehl: HOCH (aufwärts)');
    await new Promise(r => setTimeout(r, 1000));
    
    await sendCommand(socket, 'STOP', '3️⃣  Befehl: STOP (Stopp)');
    await new Promise(r => setTimeout(r, 1500));
    
    console.log('\n╔═════════════════════════════════════════════════╗');
    console.log('║  BEOBACHTUNG:                                   ║');
    console.log('║  • Fährt der Motor jetzt?                       ║');
    console.log('║  • Mit Adresse 0x00 sollte es klappen!          ║');
    console.log('╚═════════════════════════════════════════════════╝\n');
    
    socket.destroy();
  }
);

socket.on('error', (err) => {
  console.error(`❌ Fehler: ${err.message}`);
  process.exit(1);
});
