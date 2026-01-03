#!/usr/bin/env node

import net from 'node:net';

// Status Query Funktionen
function buildStatusQueryFrame(motorIds = [1, 2, 3, 4, 5], operandOffset = 0x50) {
  const frame = Buffer.alloc(24);
  frame[0] = 0x02;           // STX
  frame[1] = 0x13;           // LEN
  frame[2] = 0x41;           // TYPE
  frame[3] = 0x00;           // STATION
  frame[4] = 0x00;           // OPCODE
  frame[5] = motorIds.length; // COUNT
  
  for (let i = 0; i < motorIds.length; i++) {
    const offset = 6 + (i * 3);
    frame[offset] = 0x69;
    frame[offset + 1] = motorIds[i] + operandOffset;
    frame[offset + 2] = 0x00;
  }
  
  frame[21] = 0x03; // ETX
  
  let sum = 0;
  for (let i = 0; i < 21; i++) sum += frame[i];
  frame[22] = (sum >> 8) & 0xFF;
  frame[23] = sum & 0xFF;
  
  return frame;
}

function queryMotorStatus(motorNr, host, port) {
  return new Promise((resolve) => {
    const frame = buildStatusQueryFrame([motorNr], 0x50);
    const sock = net.createConnection({ host, port });
    
    let response = Buffer.alloc(0);
    let timeoutHandle;
    
    sock.on('connect', () => {
      console.log(`   ✓ Verbunden zu ${host}:${port}`);
      sock.write(frame);
    });
    
    sock.on('data', (data) => {
      response = Buffer.concat([response, data]);
      if (response.length >= 24) {
        clearTimeout(timeoutHandle);
        sock.destroy();
        resolve(parseStatusResponse(response));
      }
    });
    
    sock.on('error', (e) => {
      console.log(`   ✗ Fehler: ${e.message}`);
      clearTimeout(timeoutHandle);
      resolve(null);
    });
    
    timeoutHandle = setTimeout(() => {
      console.log(`   ✗ Timeout nach 3000ms`);
      sock.destroy();
      resolve(null);
    }, 3000);
  });
}

function parseStatusResponse(buffer) {
  if (buffer.length < 24) return null;
  
  const status = buffer[3];
  const dataSize = buffer[4];
  
  return {
    status: status === 0x21 ? 'OK' : 'ERROR',
    dataSize: dataSize,
    raw: buffer.toString('hex')
  };
}

// Test
async function test() {
  console.log('\n🔍 Status Query Integration Test\n');
  
  // Test Motor 1 bei Arbeiten (SPS3)
  console.log('Test 1: Motor Arbeiten (Motor 6) bei SPS3');
  const result1 = await queryMotorStatus(6, '192.168.1.103', 1003);
  if (result1) {
    console.log(`✓ Status: ${result1.status}`);
    console.log(`  Response: ${result1.raw.substring(0, 30)}...`);
  } else {
    console.log('✗ Keine Antwort');
  }
  
  console.log('\nTest 2: Motor Wohnen_Ost (Motor 1) bei SPS1');
  const result2 = await queryMotorStatus(1, '192.168.1.101', 1001);
  if (result2) {
    console.log(`✓ Status: ${result2.status}`);
    console.log(`  Response: ${result2.raw.substring(0, 30)}...`);
  } else {
    console.log('✗ Keine Antwort');
  }
  
  console.log('\n✅ Test abgeschlossen\n');
}

test().catch(console.error);
