const net = require('net');

function buildFrame(status, addrLow) {
  const frame = Buffer.from([
    0x02, 0x08, 0x41, 0x00, 0x01, 0x01, 0x48,
    status, addrLow, 0x00
  ]);
  
  let sum = 0;
  for (let i = 2; i < frame.length; i++) {
    sum += frame[i];
  }
  return Buffer.concat([frame, Buffer.from([0x03, sum & 0xFF, (sum >> 8) & 0xFF])]);
}

const HOST = '192.168.178.234';
const PORT = 1001;

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  Testing ALL 6 motors with correct frame format       ║');
console.log('║  Each motor will get RUNTER (DOWN) command            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const motors = [
  { name: 'Motor 0 (Wohnen_Ost?)', addr: 0x00 },
  { name: 'Motor 1 (Sued_links?)', addr: 0x01 },
  { name: 'Motor 2 (Sued_rechts?)', addr: 0x02 },
  { name: 'Motor 3 (West_links?)', addr: 0x03 },
  { name: 'Motor 4 (West_rechts?)', addr: 0x04 },
  { name: 'Motor 5 (Arbeiten?)', addr: 0x05 },
];

async function testAllMotors() {
  for (const motor of motors) {
    await new Promise((resolve) => {
      const sock = net.createConnection({ host: HOST, port: PORT }, () => {
        const frame = buildFrame(0x02, motor.addr);
        console.log(`${motor.name.padEnd(30)} Addr: 0x${motor.addr.toString(16).padStart(2, '0')}`);
        console.log(`${' '.padEnd(30)} Frame: ${frame.toString('hex')}`);
        
        let responseCount = 0;
        sock.on('data', (data) => {
          responseCount++;
          console.log(`${' '.padEnd(30)} RX${responseCount}: ${data.toString('hex')}`);
        });
        
        sock.write(frame);
        setTimeout(() => {
          if (responseCount === 0) {
            console.log(`${' '.padEnd(30)} ⏱️  No response`);
          }
          console.log('');
          sock.destroy();
          resolve();
        }, 700);
      });
      
      sock.on('error', () => resolve());
    });
  }
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  ✓ Testing complete                                   ║');
  console.log('║  OBSERVATION: Which motor moved?                      ║');
  console.log('║  Update addresses.json based on results                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

testAllMotors();
