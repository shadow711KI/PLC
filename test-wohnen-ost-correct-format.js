const net = require('net');

// Test based on working frame from test-motor-arbeiten.js
// Working: 02 08 41 00 01 01 48 02 05 00 03 92 00
// Structure: STX(02) | LEN(08) | TYP(41) | STA(00) | CNT(01) | OPC(01) | OPCODE(48) | STATUS | ADDR_L | ADDR_H | ETX(03) | CKSUM

function buildFrame(status, addrLow, addrHigh) {
  const frame = Buffer.from([
    0x02,      // STX
    0x08,      // Length
    0x41,      // Type
    0x00,      // Station
    0x01,      // OpCount
    0x01,      // OpCode (0x01)
    0x48,      // Motor operation
    status,    // Status (0x01=UP, 0x02=DOWN, 0x03=STOP)
    addrLow,   // Motor address low
    addrHigh   // Motor address high  
  ]);
  
  // Calculate checksum
  let sum = 0;
  for (let i = 2; i < frame.length; i++) {
    sum += frame[i];
  }
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.concat([frame, Buffer.from([0x03, ckLow, ckHigh])]);
}

const HOST = '192.168.178.234';
const PORT = 1001;

console.log('\n╔═════════════════════════════════════════════════════════╗');
console.log('║  Testing CORRECT FRAME FORMAT with Wohnen_Ost          ║');
console.log('║  Testing different addresses for Motor 1               ║');
console.log('╚═════════════════════════════════════════════════════════╝\n');

async function testMotor() {
  // Try different addresses for Wohnen_Ost (Motor 1)
  const addresses = [
    { name: 'Address 0x00', low: 0x00, high: 0x00 },
    { name: 'Address 0x01', low: 0x01, high: 0x00 },
    { name: 'Address 0x02', low: 0x02, high: 0x00 },
    { name: 'Address 0x03', low: 0x03, high: 0x00 },
    { name: 'Address 0x04', low: 0x04, high: 0x00 },
  ];

  for (const addr of addresses) {
    await new Promise((resolve) => {
      const sock = net.createConnection({ host: HOST, port: PORT }, () => {
        const frame = buildFrame(0x02, addr.low, addr.high); // DOWN
        console.log(`${addr.name.padEnd(25)} Frame: ${frame.toString('hex')}`);
        
        let response = false;
        sock.on('data', (data) => {
          if (!response) {
            response = true;
            console.log(`${' '.padEnd(25)} Response: ${data.toString('hex')} ✅`);
          }
        });
        
        sock.write(frame);
        setTimeout(() => {
          if (!response) console.log(`${' '.padEnd(25)} ⏱️  No response`);
          sock.destroy();
          resolve();
        }, 600);
      });
      
      sock.on('error', () => resolve());
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

testMotor();
