#!/usr/bin/env node
// test-all-6-motors-corrected.js
// Comprehensive test of all 6 SPS1 motors with CORRECTED OpCode 0x48 format

import net from 'node:net';
import fs from 'fs';

const addresses = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));
const spsData = addresses.SPS1;

function buildFrame(addrLow, addrHigh, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const befLow = 0x00, befHigh = 0x00;
  const opCount = 0x01;
  const operCode = 0x48;  // Byte write operation for motor control
  const operStat = status; // UP(0x01), DOWN(0x02), STOP(0x03)
  
  // Correct frame structure:
  // TYP | BEF_LOW | BEF_HIGH | OPCOUNT | OPERCODE | ADDRLOW | ADDRHIGH | OPERSTAT
  const payload = [TYP, befLow, befHigh, opCount, operCode, addrLow, addrHigh, operStat];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  // Calculate checksum from position 2 (TYP) to one byte before ETX
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function testMotor(motorName, motorData, command, commandName) {
  return new Promise((resolve) => {
    const frame = buildFrame(motorData.addrLow, motorData.addrHigh, command);
    
    const sock = net.createConnection({ host: spsData.host, port: spsData.port });
    sock.setTimeout(2000);
    
    let response = '';
    let responseReceived = false;
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (buf) => {
      response = buf.toString('hex');
      responseReceived = true;
      if (response.includes('0203400006') || response.includes('0203400021')) {
        sock.destroy();
      }
    });
    
    sock.on('timeout', () => {
      sock.destroy();
      resolve(responseReceived && (response.includes('0203400006') || response.includes('0203400021')));
    });
    
    sock.on('error', () => {
      resolve(false);
    });
    
    sock.on('close', () => {
      resolve(responseReceived && (response.includes('0203400006') || response.includes('0203400021')));
    });
  });
}

(async () => {
  console.log('═════════════════════════════════════════════════════════');
  console.log('  TEST: All 6 SPS1 Motors with CORRECTED OpCode 0x48 Format');
  console.log('═════════════════════════════════════════════════════════\n');
  
  const motorNames = Object.keys(spsData.motors);
  const commandSequence = [
    { code: 0x02, name: 'DOWN', delay: 500 },
    { code: 0x01, name: 'UP', delay: 500 },
    { code: 0x03, name: 'STOP', delay: 300 }
  ];
  
  let allPassed = true;
  
  for (const motorName of motorNames) {
    const motorData = spsData.motors[motorName];
    console.log(`\n🔧 ${motorName} (Addr: 0x${motorData.addrLow.toString(16).padStart(2,'0')})`);
    
    for (const cmd of commandSequence) {
      const result = await testMotor(motorName, motorData, cmd.code, cmd.name);
      const status = result ? '✓' : '✗';
      console.log(`  ${status} ${cmd.name.padEnd(5)} → ${result ? 'OK' : 'FAILED'}`);
      allPassed = allPassed && result;
      
      await new Promise(resolve => setTimeout(resolve, cmd.delay));
    }
  }
  
  console.log('\n═════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✓ ALL TESTS PASSED - ALL 6 MOTORS WORKING!');
  } else {
    console.log('  ✗ SOME TESTS FAILED');
  }
  console.log('═════════════════════════════════════════════════════════\n');
  
  process.exit(allPassed ? 0 : 1);
})();
