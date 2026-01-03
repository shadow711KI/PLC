const net = require('net');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  CRITICAL TEST: Using ADDRESS 0x00 (not 0x01)             ║');
console.log('║  Testing different STATUS/DIMMER values                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

function calculateChecksum(data) {
  let sum = 0;
  for (let byte of data) {
    sum += byte;
  }
  return sum & 0xFF;
}

function buildFrame(statusValue) {
  const frame = Buffer.from([
    0x02, // STX
    0x08, // Länge
    0x41, // Typ
    0x00, // BEF_LOW
    0x00, // BEF_HIGH
    0x01, // OpCount
    0x48, // OpCode
    0x00, // Adresse Low → 0x00 (NOT 0x01!)
    0x00, // Adresse High
    statusValue, // Status/Befehl/Dimmer
    0x03  // ETX
  ]);
  return Buffer.concat([frame, Buffer.from([calculateChecksum(frame)])]);
}

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));

async function testStatusValues() {
  const testValues = [
    { name: 'RUNTER (0x02)', value: 0x02 },
    { name: 'HOCH (0x01)', value: 0x01 },
    { name: 'STOP (0x03)', value: 0x03 },
  ];

  for (const test of testValues) {
    await new Promise((resolve) => {
      const socket = net.createConnection(
        { host: config.SPS1.host, port: config.SPS1.port },
        () => {
          const frame = buildFrame(test.value);
          console.log(`Test: ${test.name.padEnd(30)} @ Addr 0x00`);
          console.log(`  Frame: ${frame.toString('hex')}`);
          
          let responseReceived = false;
          socket.on('data', (data) => {
            if (!responseReceived) {
              responseReceived = true;
              console.log(`  ✅ Response: ${data.toString('hex')}`);
            }
          });
          
          socket.write(frame);
          
          setTimeout(() => {
            if (!responseReceived) {
              console.log(`  ⏱️  No response`);
            }
            socket.destroy();
            resolve();
          }, 600);
        }
      );
      
      socket.on('error', (err) => {
        console.error(`  ❌ Error: ${err.message}`);
        resolve();
      });
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

testStatusValues().catch(console.error);
