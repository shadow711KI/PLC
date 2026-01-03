#!/usr/bin/env node

/**
 * Test Script: Verify Sessions #32-34 Query Frames on Real SPS Units
 * 
 * These are multi-motor status query frames documented in:
 * Befehle-iHomeControl-K2-0.pdf -> "Motorlaufzeiten auslesen"
 * 
 * Purpose: Send query frames to SPS and observe responses
 */

import net from 'node:net';
import fs from 'fs';

const spsMap = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const QUERIES = {
  S32_BASE_OFFSET: {
    name: 'Session #32: Motors 1-5 with 0x50 Offset (SPS1?)',
    hex: '02134100000569510069520069530069540069550003F203',
    description: 'Query motors 1-5 using operands 0x51-0x55 (base 0x01-0x05 + 0x50)',
  },
  S34_BASE_OFFSET: {
    name: 'Session #34: Motors 1-5 with 0x20 Offset (SPS2/3?)',
    hex: '021341000005692100692200692300692400692500030203',
    description: 'Query motors 1-5 using operands 0x21-0x25 (base 0x01-0x05 + 0x20)',
  },
  PDF_BASE: {
    name: 'PDF Reference: Motors 1-5 with Base Operands',
    hex: '021341000005690100690200690300690400690500036202',
    description: 'From PDF doc: Uses base operands 0x01-0x05',
  },
};

async function testQueryOnSPS(spsName, spsData, queryKey, queryData) {
  return new Promise((resolve) => {
    const frame = Buffer.from(queryData.hex, 'hex');
    const sock = net.createConnection({ 
      host: spsData.host, 
      port: spsData.port,
      timeout: 3000
    });

    let response = Buffer.alloc(0);
    let receivedAny = false;

    sock.on('connect', () => {
      console.log(`  ✓ Connected to ${spsName}`);
      sock.write(frame);
    });

    sock.on('data', (chunk) => {
      receivedAny = true;
      response = Buffer.concat([response, chunk]);
      console.log(`  ✓ Received ${chunk.length} bytes`);
    });

    sock.on('timeout', () => {
      console.log(`  ⚠ Timeout waiting for response`);
      sock.destroy();
    });

    sock.on('error', (e) => {
      console.log(`  ✗ Error: ${e.message}`);
      resolve(null);
    });

    sock.on('close', () => {
      if (receivedAny) {
        console.log(`  Response HEX: ${response.toString('hex').toUpperCase()}`);
        console.log(`  Response Length: ${response.length} bytes`);
        console.log(`  Response DEC: ${Array.from(response).join(' ')}`);
        
        // Try to parse response
        if (response.length > 0) {
          const stx = response[0];
          const len = response[1];
          const cmd = response[2];
          console.log(`  Parse: STX=0x${stx.toString(16).toUpperCase()}, LEN=0x${len.toString(16).toUpperCase()}, CMD=0x${cmd.toString(16).toUpperCase()}`);
        }
      } else {
        console.log(`  No response received`);
      }
      resolve(receivedAny);
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Sessions #32-34 Query Frames on Real SPS Units      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Queries to test:\n');
  for (const [key, query] of Object.entries(QUERIES)) {
    console.log(`  ${key}:`);
    console.log(`    Name: ${query.name}`);
    console.log(`    HEX:  ${query.hex}`);
    console.log(`    Desc: ${query.description}\n`);
  }

  console.log('────────────────────────────────────────────────────────────\n');

  // Test Session #32 on SPS1
  console.log('TEST 1: Session #32 (0x50 offset) on SPS1');
  console.log('────────────────────────────────────────────────────────────');
  if (spsMap.SPS1) {
    const sps1Result = await testQueryOnSPS('SPS1', spsMap.SPS1, 'S32_BASE_OFFSET', QUERIES.S32_BASE_OFFSET);
    if (!sps1Result) {
      console.log('  (Connection failed or no response)\n');
    } else {
      console.log('  SUCCESS: SPS1 responded to 0x50 offset query\n');
    }
  }

  // Test Session #32 on SPS2
  console.log('TEST 2: Session #32 (0x50 offset) on SPS2');
  console.log('────────────────────────────────────────────────────────────');
  if (spsMap.SPS2) {
    const sps2ResultA = await testQueryOnSPS('SPS2', spsMap.SPS2, 'S32_BASE_OFFSET', QUERIES.S32_BASE_OFFSET);
    if (!sps2ResultA) {
      console.log('  (Connection failed or no response)\n');
    } else {
      console.log('  SPS2 also responds to 0x50 offset query\n');
    }
  }

  // Test Session #34 on SPS2
  console.log('TEST 3: Session #34 (0x20 offset) on SPS2');
  console.log('────────────────────────────────────────────────────────────');
  if (spsMap.SPS2) {
    const sps2ResultB = await testQueryOnSPS('SPS2', spsMap.SPS2, 'S34_BASE_OFFSET', QUERIES.S34_BASE_OFFSET);
    if (!sps2ResultB) {
      console.log('  (Connection failed or no response)\n');
    } else {
      console.log('  SPS2 responds to 0x20 offset query\n');
    }
  }

  // Test Session #34 on SPS3
  console.log('TEST 4: Session #34 (0x20 offset) on SPS3');
  console.log('────────────────────────────────────────────────────────────');
  if (spsMap.SPS3) {
    const sps3Result = await testQueryOnSPS('SPS3', spsMap.SPS3, 'S34_BASE_OFFSET', QUERIES.S34_BASE_OFFSET);
    if (!sps3Result) {
      console.log('  (Connection failed or no response)\n');
    } else {
      console.log('  SUCCESS: SPS3 responds to 0x20 offset query\n');
    }
  }

  // Test PDF base reference
  console.log('TEST 5: PDF Base Operands (0x01-0x05) on SPS1');
  console.log('────────────────────────────────────────────────────────────');
  if (spsMap.SPS1) {
    const pdfResult = await testQueryOnSPS('SPS1', spsMap.SPS1, 'PDF_BASE', QUERIES.PDF_BASE);
    if (!pdfResult) {
      console.log('  (Connection failed or no response)\n');
    } else {
      console.log('  SPS1 responds to base operands\n');
    }
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Complete                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('ANALYSIS:');
  console.log('If different SPS units respond to different offsets, we can');
  console.log('implement SPS-specific query functions in motor-control.js\n');
}

main().catch(console.error);
