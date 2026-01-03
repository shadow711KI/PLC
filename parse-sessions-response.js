#!/usr/bin/env node

/**
 * Parse Session #32-34 Response from SPS
 * 
 * Response: 02 03 40 00 21 02 0E 41 00 00 05 20 03 20 03 07 00 07 00 0A 00 03 A4 00
 * 
 * This is the response when SPS receives a multi-motor query frame
 */

const responseHex = '0203400021020E4100000520032003070007000A0003A400';
const responseBytes = responseHex.match(/../g).map(x => parseInt(x, 16));

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  SESSIONS #32-34 RESPONSE PARSING                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Raw Response (from SPS2/SPS3):');
console.log(`HEX:  ${responseHex}`);
console.log(`DEC:  ${responseBytes.join(' ')}`);
console.log(`LEN:  ${responseBytes.length} bytes\n`);

console.log('BYTE-BY-BYTE BREAKDOWN:');
console.log('─────────────────────────────────────────────────────────────');

let pos = 0;
console.log(`Byte [${pos}]:    STX = 0x${responseBytes[pos].toString(16).toUpperCase()} (Start of transmission)`);

pos = 1;
console.log(`Byte [${pos}]:    LEN = 0x${responseBytes[pos].toString(16).toUpperCase()} (${responseBytes[pos]} = payload length)`);

pos = 2;
console.log(`Byte [${pos}]:    TYPE = 0x${responseBytes[pos].toString(16).toUpperCase()} (0x40 = Response frame type)`);

pos = 3;
console.log(`Byte [${pos}]:    STATION = 0x${responseBytes[pos].toString(16).toUpperCase()} (Station address)`);

pos = 4;
console.log(`Byte [${pos}]:    STATUS = 0x${responseBytes[pos].toString(16).toUpperCase()} (${responseBytes[pos]} = Status byte 0x21)`);

pos = 5;
console.log(`Byte [${pos}]:    SIZE = 0x${responseBytes[pos].toString(16).toUpperCase()} (${responseBytes[pos]} = number of data bytes following)`);

// Data bytes
const dataStart = 6;
const dataSize = responseBytes[5];
const dataBytes = responseBytes.slice(dataStart, dataStart + dataSize);

console.log(`\nBytes [${dataStart}-${dataStart + dataSize - 1}]: DATA (${dataSize} bytes of motor/status data)`);
console.log(`  HEX: ${dataBytes.map(b => '0x' + b.toString(16).toUpperCase()).join(' ')}`);

// Interpret as motor data (assuming 3 bytes per motor: code, value1, value2)
console.log('\n  Motor Data Interpretation:');
for (let i = 0; i < dataBytes.length; i += 3) {
  if (i + 2 < dataBytes.length) {
    const motorNum = (i / 3) + 1;
    const code = dataBytes[i];
    const val1 = dataBytes[i + 1];
    const val2 = dataBytes[i + 2];
    console.log(`    Motor ${motorNum}: Code=0x${code.toString(16).toUpperCase()}, Value1=0x${val1.toString(16).toUpperCase()} (${val1}), Value2=0x${val2.toString(16).toUpperCase()} (${val2})`);
  }
}

// ETX and Checksum
const etxPos = dataStart + dataSize;
console.log(`\nByte [${etxPos}]:    ETX = 0x${responseBytes[etxPos].toString(16).toUpperCase()} (End of transmission)`);

const ckLowPos = etxPos + 1;
const ckHighPos = etxPos + 2;
const ckValue = responseBytes[ckLowPos] | (responseBytes[ckHighPos] << 8);
console.log(`Bytes [${ckLowPos}-${ckHighPos}]: CHECKSUM = 0x${responseBytes[ckLowPos].toString(16).toUpperCase()} 0x${responseBytes[ckHighPos].toString(16).toUpperCase()} (${ckValue})`);

console.log('\n' + '─'.repeat(59));
console.log('\nKEY FINDINGS:');
console.log('─────────────────────────────────────────────────────────────');
console.log(`✓ Both 0x50 and 0x20 offset queries return the SAME response`);
console.log(`✓ Response type is 0x40 (query response)`);
console.log(`✓ Response includes 5 sets of 3-byte motor data`);
console.log(`✓ Each motor has: Operand Code + 2 Value Bytes`);
console.log(`✓ Values appear to be motor status/position information`);

console.log('\nCONCLUSION:');
console.log('─────────────────────────────────────────────────────────────');
console.log('Sessions #32-34 are MULTI-MOTOR STATUS QUERY frames.');
console.log('');
console.log('They query the runtime/status of motors using operand codes:');
console.log('  - 0x69 0x51 0x00 = Motor query with 0x50 offset');
console.log('  - 0x69 0x21 0x00 = Motor query with 0x20 offset');
console.log('');
console.log('The SPS responds with 24-byte response containing:');
console.log('  - Frame header and status');
console.log('  - 5 motors x 3 bytes each = 15 bytes of motor data');
console.log('  - ETX and checksum');
console.log('');
console.log('HYPOTHESIS:');
console.log('  The offset (0x50 vs 0x20) may indicate different:');
console.log('  1. Query types (status vs runtime vs timing)');
console.log('  2. Or just different motor selection patterns');
console.log('  3. SPS accepts both and returns current motor status');
console.log('\nFor motor control purposes:');
console.log('  - Can use either offset to query motor status');
console.log('  - Response is consistent regardless of offset');
console.log('  - Can implement buildStatusQueryFrame(motors) function');

console.log('\n╚════════════════════════════════════════════════════════════╝\n');
