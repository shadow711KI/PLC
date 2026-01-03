// identify-6-motors-corrected.js
// Interactive motor identification using the CORRECTED frame format

import net from 'node:net';
import * as readline from 'readline';

const HOST = '192.168.178.234';
const PORT = 1001;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function buildFrame(addrLow, addrHigh, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const befLow = 0x00, befHigh = 0x00;
  const opCount = 0x01;
  const operCode = 0x48;
  const operStat = status;
  
  const payload = [TYP, befLow, befHigh, opCount, operCode, addrLow, addrHigh, operStat];
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

function sendCommand(addrLow, addrHigh, command) {
  return new Promise((resolve) => {
    const frame = buildFrame(addrLow, addrHigh, command);
    
    const sock = net.createConnection({ host: HOST, port: PORT });
    sock.setTimeout(2000);
    
    let response = '';
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (buf) => {
      response = buf.toString('hex');
      sock.destroy();
    });
    
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    
    sock.on('error', () => {
      resolve(false);
    });
    
    sock.on('close', () => {
      resolve(response.includes('0203400006') || response.includes('0203400021'));
    });
  });
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

(async () => {
  console.log('\n===== MOTOR IDENTIFICATION - CORRECTED FORMAT =====');
  console.log(`Target: ${HOST}:${PORT}\n`);
  
  const motors = {};
  const addresses = [1, 2, 3, 4, 5, 6];
  
  for (const addr of addresses) {
    console.log(`\n--- TESTING ADDRESS ${addr} ---`);
    console.log(`Sending DOWN command to motor at address 0x${addr.toString(16).padStart(2,'0')}...`);
    
    const ok = await sendCommand(addr, 0x00, 0x02);
    
    if (ok) {
      console.log('✓ Motor responded and should have moved DOWN');
      const motorName = await question('Enter motor name (or skip with Enter): ');
      
      if (motorName.trim()) {
        motors[motorName.trim()] = {
          nr: addr,
          addrLow: addr,
          addrHigh: 0x00
        };
        console.log(`→ Motor "${motorName}" recorded at address 0x${addr.toString(16).padStart(2,'0')}`);
      } else {
        console.log(`→ Motor address 0x${addr.toString(16).padStart(2,'0')} skipped`);
      }
    } else {
      console.log('✗ Motor did not respond');
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  rl.close();
  
  console.log('\n===== SUMMARY =====');
  console.log('Identified motors:');
  console.log(JSON.stringify(motors, null, 2));
  
  if (Object.keys(motors).length > 0) {
    console.log('\nTo use these motors, add this to addresses.json:');
    console.log(JSON.stringify({
      "SPS1": {
        "host": "192.168.178.234",
        "port": 1001,
        "station": 0,
        "motors": motors
      }
    }, null, 2));
  }
})();
