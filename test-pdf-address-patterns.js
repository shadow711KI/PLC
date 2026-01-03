const net = require('net');
const fs = require('fs');

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  Testing ALTERNATIVE ADDRESS PATTERNS from PDF examples  ║');
console.log('║  Motor 1: 0x01, Motor 2: 0x02, Motor 3: 0x13, Motor 4:   ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

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

async function testAddresses() {
  const tests = [
    { motor: 'Motor 1 (Wohnen_Ost)', addr: 0x01, cmd: 'RUNTER' },
    { motor: 'Motor 2 (Sued_links)', addr: 0x02, cmd: 'RUNTER' },
    { motor: 'Motor 3', addr: 0x13, cmd: 'RUNTER' },
    { motor: 'Motor 4', addr: 0x14, cmd: 'RUNTER' },
    { motor: 'Motor 5', addr: 0x23, cmd: 'RUNTER' },
    { motor: 'Motor 6', addr: 0x24, cmd: 'RUNTER' },
  ];

  for (const test of tests) {
    await new Promise((resolve) => {
      const socket = net.createConnection(
        { host: config.SPS1.host, port: config.SPS1.port },
        () => {
          const frame = buildFrame(test.addr, 0x02);
          console.log(`${test.motor.padEnd(35)} Addr: 0x${test.addr.toString(16).padStart(2, '0')}`);
          console.log(`  Frame: ${frame.toString('hex')}`);
          
          let received = false;
          socket.on('data', (data) => {
            if (!received) {
              received = true;
              console.log(`  ✅ Response: ${data.toString('hex')}`);
            }
          });
          
          socket.write(frame);
          setTimeout(() => {
            if (!received) console.log(`  ⏱️  No response`);
            socket.destroy();
            resolve();
          }, 500);
        }
      );
      
      socket.on('error', (err) => {
        console.error(`  ❌ Error: ${err.message}`);
        resolve();
      });
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testAddresses().catch(console.error);
