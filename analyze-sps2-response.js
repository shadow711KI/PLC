// Analyse SPS2 Status-Response aus dem Log
const hex = '021f41000015010001000100010001000001010000000000010000000100000000035f00';
const buffer = Buffer.from(hex, 'hex');

console.log('=== SPS2 Status Response Analyse ===\n');
console.log('Gesamt-Länge:', buffer.length, 'bytes');
console.log('HEX:', hex);

// Überspringe ACK (wenn vorhanden)
let dataFrame = buffer;
if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
  dataFrame = buffer.slice(5);
  console.log('\n⚠️ ACK-Frame erkannt, überspringe 5 bytes');
}

console.log('\n--- Frame-Struktur ---');
console.log('STX:', dataFrame[0].toString(16).padStart(2, '0'));
console.log('LEN:', dataFrame[1].toString(16).padStart(2, '0'), `(${dataFrame[1]} bytes)`);
console.log('TYP:', dataFrame[2].toString(16).padStart(2, '0'));
console.log('Befehl:', dataFrame[3].toString(16).padStart(2, '0'), dataFrame[4].toString(16).padStart(2, '0'));
console.log('COUNT:', dataFrame[5].toString(16).padStart(2, '0'), `(${dataFrame[5]} Werte)`);

console.log('\n--- Position-Bytes (Offset 6-17, 12 bytes = 6 Motoren × 2 bytes) ---');
for (let i = 0; i < 6; i++) {
  const offset = 6 + (i * 2);
  const byte1 = dataFrame[offset];
  const byte2 = dataFrame[offset + 1];
  console.log(`Motor ${i+1}: [${offset}]=${byte1.toString(16).padStart(2, '0')} [${offset+1}]=${byte2.toString(16).padStart(2, '0')}`);
}

console.log('\n--- Automatik-Bytes (Offset 18-29, 12 bytes = 6 Motoren × 2 bytes) ---');
const automatikStartOffset = 18;
for (let i = 0; i < 6; i++) {
  const offset = automatikStartOffset + (i * 2);
  const byte1 = dataFrame[offset];
  const byte2 = dataFrame[offset + 1];
  console.log(`Motor ${i+1}: [${offset}]=${byte1.toString(16).padStart(2, '0')} [${offset+1}]=${byte2.toString(16).padStart(2, '0')} → ${byte1 === 0x01 ? 'AN ✅' : 'AUS ❌'}`);
}

console.log('\n--- ALLE BYTES (mit Indizes) ---');
for (let i = 0; i < dataFrame.length; i++) {
  const marker = (i >= 6 && i <= 17) ? ' [POS]' : (i >= 18 && i <= 29) ? ' [AUTO]' : '';
  console.log(`[${i.toString().padStart(2, ' ')}] ${dataFrame[i].toString(16).padStart(2, '0')}${marker}`);
}

console.log('\n--- Parser-Simulation (wie im Code) ---');
const result = {};
for (let motorNr = 1; motorNr <= 6; motorNr++) {
  const offset = automatikStartOffset + ((motorNr - 1) * 2);
  const value = dataFrame[offset];
  result[motorNr] = { enabled: value === 0x01 };
  console.log(`Motor ${motorNr}: offset=${offset}, value=${value.toString(16).padStart(2, '0')}, enabled=${value === 0x01}`);
}

console.log('\nErgebnis:', result);
