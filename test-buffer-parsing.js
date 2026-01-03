// Test der Buffer-Parsing-Logik mit echten Daten aus dem Log
const hex = '0203400021021f41000015000000000100010000000000010001000100010001000100000000035e00';
const buffer = Buffer.from(hex, 'hex');

console.log('=== Buffer-Analyse ===');
console.log('Gesamt-Länge:', buffer.length, 'bytes');
console.log('HEX:', hex);
console.log('\n--- Zwei Frames erkannt ---');

// Frame 1: ACK
const ack = buffer.slice(0, 5);
console.log('ACK Frame:', ack.toString('hex'), '(5 bytes)');

// Frame 2: Daten (ab Byte 5)
const dataFrame = buffer.slice(5);
console.log('Data Frame:', dataFrame.toString('hex'), `(${dataFrame.length} bytes)`);

console.log('\n--- Data Frame Struktur ---');
console.log('STX:', dataFrame[0].toString(16).padStart(2, '0'));
console.log('LEN:', dataFrame[1].toString(16).padStart(2, '0'), `(${dataFrame[1]} bytes)`);
console.log('TYP:', dataFrame[2].toString(16).padStart(2, '0'));
console.log('Befehl:', dataFrame[3].toString(16).padStart(2, '0'), dataFrame[4].toString(16).padStart(2, '0'));
console.log('COUNT:', dataFrame[5].toString(16).padStart(2, '0'));

console.log('\n--- Automatik-Bytes (2 Bytes pro Motor, Start: Byte 18 im Data Frame) ---');
const automatikStartOffset = 18;
for (let motorNr = 1; motorNr <= 6; motorNr++) {
  const offset = automatikStartOffset + ((motorNr - 1) * 2);
  if (offset < dataFrame.length) {
    const value = dataFrame[offset];
    const value2 = dataFrame[offset + 1];
    console.log(`Motor ${motorNr}: [${offset}]=${value.toString(16).padStart(2, '0')} [${offset+1}]=${value2.toString(16).padStart(2, '0')} → ${value === 0x01 ? 'AN ✅' : 'AUS ❌'}`);
  }
}

console.log('\n--- PARSER-TEST (wie im Server) ---');
// Simuliere die aktuelle Parser-Funktion
function parseSPSStatusResponse(buffer) {
  const result = {};
  
  if (!buffer || buffer.length < 30) {
    console.log('❌ Buffer zu kurz!');
    return result;
  }
  
  const automatikStartOffset = 18;
  
  for (let motorNr = 1; motorNr <= 6; motorNr++) {
    const offset = automatikStartOffset + ((motorNr - 1) * 2);
    if (offset < buffer.length) {
      const value = buffer[offset];
      result[motorNr] = { enabled: value === 0x01 };
    }
  }
  
  return result;
}

console.log('Parser mit GESAMT-Buffer:', parseSPSStatusResponse(buffer));
console.log('Parser mit DATA-Frame:', parseSPSStatusResponse(dataFrame));
