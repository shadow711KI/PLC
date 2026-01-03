#!/usr/bin/env node

const fs = require('fs');
const net = require('net');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  TESTING ALL 6 MOTORS - FINAL VERIFICATION             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

function buildFrame(addrLow, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  const valueHigh = status;
  
  const payload = [TYP, STATION, opCount, opcode, valueLow, valueHigh, addrLow, 0x00];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

async function testAllMotors() {
  const motors = Object.entries(config.SPS1.motors);
  
  for (const [name, motor] of motors) {
    await new Promise((resolve) => {
      console.log(`🔵 ${name.padEnd(25)} (Addr: 0x${motor.addrLow.toString(16).padStart(2, '0')})`);
      
      const socket = net.createConnection(
        { host: config.SPS1.host, port: config.SPS1.port },
        () => {
          const frame = buildFrame(motor.addrLow, 0x02); // RUNTER
          console.log(`    TX: ${frame.toString('hex')}`);
          
          let responseReceived = false;
          socket.on('data', (data) => {
            if (!responseReceived) {
              console.log(`    RX: ${data.toString('hex')}`);
              if (data.toString('hex').includes('0203400')) {
                console.log(`    ✅ ERFOLG!\n`);
              }
              responseReceived = true;
            }
          });
          
          socket.write(frame);
          
          setTimeout(() => {
            if (!responseReceived) {
              console.log(`    ❌ KEIN RESPONSE!\n`);
            }
            socket.destroy();
            resolve();
          }, 800);
        }
      );
      
      socket.on('error', (err) => {
        console.log(`    ❌ Error: ${err.message}\n`);
        resolve();
      });
    });
  }
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  BEOBACHTUNG: Welche Motoren fahren jetzt?             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

testAllMotors().catch(console.error);
