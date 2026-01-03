// test-corrected-format.js
// Tests the CORRECTED frame format with proper OpCode 0x48

import net from 'node:net';

// Test the corrected frame format with the known working motor Wohnen_Ost
// Expected address: LOW=0x01, HIGH=0x00 (based on PDF_ANALYSIS examples)

const HOST = '192.168.178.234';
const PORT = 1001;

function buildFrame(addrLow, addrHigh, status, motorName) {
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
  
  const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);
  console.log(`\n${motorName}:`);
  console.log(`  Address: Low=0x${addrLow.toString(16).padStart(2,'0')}, High=0x${addrHigh.toString(16).padStart(2,'0')}`);
  console.log(`  Command: ${status === 0x01 ? 'UP' : status === 0x02 ? 'DOWN' : 'STOP'}`);
  console.log(`  Frame:   ${frame.toString('hex').toUpperCase()}`);
  return frame;
}

function testMotor(motorName, addrLow, addrHigh, command) {
  return new Promise((resolve) => {
    const frame = buildFrame(addrLow, addrHigh, command, motorName);
    
    const sock = net.createConnection({ host: HOST, port: PORT });
    sock.setTimeout(3000);
    
    let response = '';
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (buf) => {
      response = buf.toString('hex');
      console.log(`  Response: ${response.toUpperCase()}`);
      sock.destroy();
    });
    
    sock.on('timeout', () => {
      console.log(`  ✗ Timeout`);
      sock.destroy();
      resolve(false);
    });
    
    sock.on('error', (e) => {
      console.log(`  ✗ Error: ${e.message}`);
      resolve(false);
    });
    
    sock.on('close', () => {
      if (response.includes('0203400006') || response.includes('0203400021')) {
        console.log(`  ✓ OK`);
        resolve(true);
      } else if (response.includes('1503')) {
        console.log(`  ✗ Unconfigured (Error 1503)`);
        resolve(false);
      } else {
        console.log(`  ? Unknown response`);
        resolve(false);
      }
    });
  });
}

// Test with corrected format
(async () => {
  console.log('===== TESTING CORRECTED FRAME FORMAT WITH OpCode 0x48 =====');
  console.log(`Target: ${HOST}:${PORT}`);
  
  // Test 1: Known working motor with corrected format
  console.log('\n--- Test 1: Wohnen_Ost (LOW=0x01, HIGH=0x00) ---');
  await testMotor('Wohnen_Ost', 0x01, 0x00, 0x02); // DOWN
  
  // Test 2: Try addresses based on the fact that only 1 motor moves
  // If LOW=0x01 works, try LOW=0x02, 0x03, etc. for other motors
  console.log('\n--- Test 2: Testing sequential addresses for other motors ---');
  
  for (let i = 2; i <= 6; i++) {
    await testMotor(`Motor_${i}`, i, 0x00, 0x02); // DOWN
    await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
  }
  
  console.log('\n===== TESTS COMPLETED =====');
})();
