const net = require('net');
const fs = require('fs');

// plcSmartHomeDB shows dimmerLowerLimit: 18, dimmerUpperLimit: 105
// Let's test if status should be dimmer values instead of 0x01/0x02/0x03

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
const motor = config.SPS1.motors.Wohnen_Ost;

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  DIAGNOSTIC: Testing different STATUS/DIMMER values       ║');
console.log('║  plcSmartHomeDB shows: dimmerLower=18, dimmerUpper=105   ║');
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
    motor.addrLow, // Adresse Low
    motor.addrHigh, // Adresse High
    statusValue, // Status/Befehl/Dimmer
    0x03  // ETX
  ]);
  return Buffer.concat([frame, Buffer.from([calculateChecksum(frame)])]);
}

async function testStatusValues() {
  // Test different status values
  const testValues = [
    { name: 'RUNTER (0x02)', value: 0x02 },
    { name: 'HOCH (0x01)', value: 0x01 },
    { name: 'STOP (0x03)', value: 0x03 },
    { name: 'Dimmer MIN (18/0x12)', value: 0x12 },
    { name: 'Dimmer MAX (105/0x69)', value: 0x69 },
    { name: 'Dimmer MID (60)', value: 60 },
    { name: '0x00 (null)', value: 0x00 },
    { name: '0x04 (unknown)', value: 0x04 },
    { name: '0x05 (unknown)', value: 0x05 },
  ];

  for (const test of testValues) {
    await new Promise((resolve) => {
      const socket = net.createConnection(
        { host: config.SPS1.host, port: config.SPS1.port },
        () => {
          const frame = buildFrame(test.value);
          console.log(`Test: ${test.name.padEnd(30)} → Value: 0x${test.value.toString(16).padStart(2, '0')}`);
          console.log(`  Frame: ${frame.toString('hex')}`);
          
          let responseReceived = false;
          socket.on('data', (data) => {
            if (!responseReceived) {
              responseReceived = true;
              const success = data.toString('hex').includes('0203400');
              const indicator = success ? '✅' : '❌';
              console.log(`  Response: ${data.toString('hex')} ${indicator}`);
            }
          });
          
          socket.write(frame);
          
          setTimeout(() => {
            if (!responseReceived) {
              console.log(`  ⏱️  No response received`);
            }
            socket.destroy();
            resolve();
          }, 600);
        }
      );
      
      socket.on('error', (err) => {
        console.error(`  ❌ Socket error: ${err.message}`);
        resolve();
      });
    });
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  OBSERVATION: Which status values got responses?          ║');
  console.log('║  Did any of them actually move the motor?                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

testStatusValues().catch(console.error);
