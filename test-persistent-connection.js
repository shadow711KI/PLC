const net = require('net');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Testing with PERSISTENT CONNECTION and LONG TIMEOUT       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));

function calculateChecksum(data) {
  let sum = 0;
  for (let byte of data) sum += byte;
  return sum & 0xFF;
}

function buildFrame(addrLow, statusValue) {
  const frame = Buffer.from([
    0x02, 0x08, 0x41, 0x00, 0x00, 0x01, 0x48,
    addrLow, 0x00, statusValue, 0x03
  ]);
  return Buffer.concat([frame, Buffer.from([calculateChecksum(frame)])]);
}

const socket = net.createConnection(
  { host: config.SPS1.host, port: config.SPS1.port },
  () => {
    console.log(`✓ Connected to SPS1 (${config.SPS1.host}:${config.SPS1.port})\n`);
    
    // Keep connection alive
    socket.setKeepAlive(true, 10000);
    
    // Test Wohnen_Ost at address 0x01
    const frame1 = buildFrame(0x01, 0x02); // RUNTER
    console.log('1️⃣  Sending RUNTER to Wohnen_Ost (addr 0x01)');
    console.log(`    Frame: ${frame1.toString('hex')}`);
    socket.write(frame1);
    
    // Wait, then test Arbeiten at address 0x06
    setTimeout(() => {
      const frame2 = buildFrame(0x06, 0x02); // RUNTER
      console.log('\n2️⃣  Sending RUNTER to Arbeiten (addr 0x06)');
      console.log(`    Frame: ${frame2.toString('hex')}`);
      socket.write(frame2);
    }, 1000);
    
    // Wait, then close
    setTimeout(() => {
      console.log('\n🔌 Closing connection...\n');
      socket.destroy();
    }, 2500);
  }
);

let responseCount = 0;
socket.on('data', (data) => {
  responseCount++;
  console.log(`\n📨 Response ${responseCount}: ${data.toString('hex')}`);
});

socket.on('error', (err) => {
  console.error(`\n❌ Error: ${err.message}\n`);
});

socket.on('close', () => {
  console.log('Connection closed.\n');
});

// Keep process alive longer
setTimeout(() => {
  process.exit(0);
}, 4000);
