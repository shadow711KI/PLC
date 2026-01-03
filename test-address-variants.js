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

async function testCommand(statusValue, description) {
  return new Promise((resolve) => {
    // Test mit addrHigh: 0 für HOCH
    const frame = buildFrame(statusValue, motor.addrLow, 0);
    
    console.log(`\n${description}`);
    console.log(`Frame: ${frame.toString('hex')}`);
    
    const sock = net.createConnection(
      { host: config.SPS1.host, port: config.SPS1.port },
      () => {
        let responses = '';
        sock.on('data', (data) => {
          responses += data.toString('hex');
          console.log(`RX: ${data.toString('hex')}`);
        });
        
        sock.write(frame);
        setTimeout(() => {
          if (responses.includes('0203400006') || responses.includes('0203400021')) {
            console.log('✅ Befehl akzeptiert');
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
  console.log('\nTest: HOCH mit addrHigh: 0\n');
  await testCommand(0x01, '1️⃣  HOCH mit addrHigh=0');
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('\n\nTest: RUNTER mit addrHigh: 1\n');
  // Test mit addrHigh: 1 für RUNTER
  const frame = buildFrame(0x02, motor.addrLow, 1);
  console.log(`RUNTER mit addrHigh=1`);
  console.log(`Frame: ${frame.toString('hex')}`);
  
  const sock = net.createConnection(
    { host: config.SPS1.host, port: config.SPS1.port },
    () => {
      sock.on('data', (data) => {
        console.log(`RX: ${data.toString('hex')}`);
      });
      
      sock.write(frame);
      setTimeout(() => {
        console.log('✅ Befehl akzeptiert');
        sock.destroy();
        process.exit(0);
      }, 600);
    }
  );
  
  sock.on('error', () => process.exit(0));
})();
