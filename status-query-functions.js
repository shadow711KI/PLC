#!/usr/bin/env node

/**
 * BONUS: Multi-Motor Status Query Functions
 * 
 * These functions can be added to motor-control.js to support
 * status queries as documented in Sessions #32-34 and the PDF spec.
 * 
 * Usage (when added to motor-control.js):
 *   const buffer = buildStatusQueryFrame([1,2,3,4,5], 0x00);
 *   const response = await sendQuery(buffer, spsHost, spsPort);
 *   const status = parseStatusResponse(response);
 */

/**
 * Build a multi-motor status query frame
 * @param {number[]} motorIds - Array of motor IDs to query (1-5 or 1-6)
 * @param {number} operandOffset - Offset for operand codes (0x00, 0x50, or 0x20)
 * @returns {Buffer} Complete 24-byte query frame
 */
function buildStatusQueryFrame(motorIds, operandOffset = 0x00) {
  const STX = 0x02;
  const TYPE = 0x41;
  const STATION = 0x00;
  const OPCODE = 0x00;
  const ETX = 0x03;
  
  // Build operand list (3 bytes per motor: 0x69 [id+offset] 0x00)
  const operands = [];
  for (const motorId of motorIds) {
    operands.push(0x69);
    operands.push(motorId + operandOffset);
    operands.push(0x00);
  }
  
  // Build payload
  const payload = [TYPE, STATION, OPCODE, motorIds.length, ...operands];
  const payloadLen = payload.length;
  
  // Build frame without checksum
  const frameNoCksum = [STX, payloadLen, ...payload, ETX];
  
  // Calculate checksum (sum of bytes from TYPE to ETX-1)
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

/**
 * Send query frame to SPS and get response
 * @param {Buffer} frame - Query frame to send
 * @param {string} host - SPS host IP
 * @param {number} port - SPS port
 * @returns {Promise<Buffer>} Response from SPS
 */
async function sendStatusQuery(frame, host, port) {
  const net = require('net');
  
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port, timeout: 3000 });
    let response = Buffer.alloc(0);
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (chunk) => {
      response = Buffer.concat([response, chunk]);
    });
    
    sock.on('error', (err) => {
      reject(new Error(`Connection error: ${err.message}`));
    });
    
    sock.on('timeout', () => {
      sock.destroy();
      reject(new Error('Query timeout'));
    });
    
    sock.on('close', () => {
      resolve(response);
    });
  });
}

/**
 * Parse status query response
 * @param {Buffer} response - Response from SPS
 * @returns {Object} Parsed status information
 */
function parseStatusResponse(response) {
  if (response.length < 8) {
    return { error: 'Response too short' };
  }
  
  const stx = response[0];
  const len = response[1];
  const type = response[2];
  const station = response[3];
  const status = response[4];
  const dataSize = response[5];
  
  const result = {
    stx: `0x${stx.toString(16).toUpperCase()}`,
    length: len,
    type: `0x${type.toString(16).toUpperCase()}`,
    station: station,
    status: `0x${status.toString(16).toUpperCase()}`,
    dataSize: dataSize,
    motors: [],
  };
  
  // Parse motor data (starts at byte 6)
  const dataStart = 6;
  const dataEnd = dataStart + dataSize;
  
  for (let i = dataStart; i < dataEnd && i < response.length; i += 3) {
    if (i + 2 < response.length) {
      result.motors.push({
        code: response[i],
        value1: response[i + 1],
        value2: response[i + 2],
      });
    }
  }
  
  // Checksum (last 2 bytes)
  const ckLow = response[response.length - 2];
  const ckHigh = response[response.length - 1];
  const ckValue = ckLow | (ckHigh << 8);
  result.checksum = `0x${ckValue.toString(16).toUpperCase()}`;
  
  return result;
}

/**
 * Example usage
 */
async function exampleUsage() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Multi-Motor Status Query Functions - Example Usage      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Example 1: Build frame with base operands
  console.log('Example 1: Build status query for motors 1-5 (base offset)');
  console.log('─────────────────────────────────────────────────────────────');
  const frame1 = buildStatusQueryFrame([1, 2, 3, 4, 5], 0x00);
  console.log(`Frame: ${frame1.toString('hex').toUpperCase()}`);
  console.log(`Length: ${frame1.length} bytes\n`);
  
  // Example 2: Build frame with 0x50 offset (Session #32 style)
  console.log('Example 2: Build status query for motors 1-5 (0x50 offset)');
  console.log('─────────────────────────────────────────────────────────────');
  const frame2 = buildStatusQueryFrame([1, 2, 3, 4, 5], 0x50);
  console.log(`Frame: ${frame2.toString('hex').toUpperCase()}`);
  console.log(`Length: ${frame2.length} bytes\n`);
  
  // Example 3: Build frame with 0x20 offset (Session #34 style)
  console.log('Example 3: Build status query for motors 1-5 (0x20 offset)');
  console.log('─────────────────────────────────────────────────────────────');
  const frame3 = buildStatusQueryFrame([1, 2, 3, 4, 5], 0x20);
  console.log(`Frame: ${frame3.toString('hex').toUpperCase()}`);
  console.log(`Length: ${frame3.length} bytes\n`);
  
  // Example 4: Parse a sample response
  console.log('Example 4: Parse SPS response');
  console.log('─────────────────────────────────────────────────────────────');
  const sampleResponse = Buffer.from('0203400021020E4100000520032003070007000A0003A400', 'hex');
  const parsed = parseStatusResponse(sampleResponse);
  console.log('Parsed Response:');
  console.log(JSON.stringify(parsed, null, 2));
  
  console.log('\n╚════════════════════════════════════════════════════════════╝\n');
}

// Export functions for use in motor-control.js
module.exports = {
  buildStatusQueryFrame,
  sendStatusQuery,
  parseStatusResponse,
};

// Run example if executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}
