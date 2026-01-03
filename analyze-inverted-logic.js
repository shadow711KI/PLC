// Analyse der aktuellen SPS1 Status (wenn Arbeiten=AN, Wohnen_Ost=AUS)
const hex = '021f41000015000000000100010000000000010000000100000001000000000000035b00';
const buffer = Buffer.from(hex, 'hex');

console.log('=== SPS1 Status - Arbeiten AN, Wohnen_Ost AUS ===\n');

// Überspringe ACK
let dataFrame = buffer;
if (buffer[0] === 0x02 && buffer[1] === 0x03) {
  dataFrame = buffer.slice(5);
}

console.log('--- Automatik-Bytes (Offset 18-29) ---');
const automatikStartOffset = 18;

const motors = [
  'Wohnen_Ost',           // Motor 1
  'Wohnen_Sued_links',    // Motor 2
  'Wohnen_Sued_rechts',   // Motor 3
  'Wohnen_West_links',    // Motor 4
  'Wohnen_West_rechts',   // Motor 5
  'Arbeiten'              // Motor 6
];

for (let i = 0; i < 6; i++) {
  const offset = automatikStartOffset + (i * 2);
  const byte1 = dataFrame[offset];
  const byte2 = dataFrame[offset + 1];
  
  const interpretationA = byte1 === 0x01 ? 'AN' : 'AUS';  // 0x01=AN
  const interpretationB = byte1 === 0x00 ? 'AN' : 'AUS';  // 0x00=AN (invertiert)
  const interpretationC = byte2 === 0x01 ? 'AN' : 'AUS';  // 2. Byte entscheidend
  
  console.log(`${motors[i].padEnd(20)} Motor ${i+1}: [${offset}]=${byte1.toString(16).padStart(2, '0')} [${offset+1}]=${byte2.toString(16).padStart(2, '0')}`);
  console.log(`  → Interpretation A (byte1, 0x01=AN): ${interpretationA}`);
  console.log(`  → Interpretation B (byte1, 0x00=AN): ${interpretationB}`);
  console.log(`  → Interpretation C (byte2, 0x01=AN): ${interpretationC}`);
}

console.log('\n--- LÖSUNG BASIEREND AUF ORIGINAL-APP ---');
console.log('Laut Original-App:');
console.log('  Arbeiten (Motor 6) = AN');
console.log('  Wohnen_Ost (Motor 1) = AUS');
console.log('\nBytes:');
console.log('  Motor 6 (Arbeiten): [28]=00 [29]=00');
console.log('  Motor 1 (Wohnen_Ost): [18]=01 [19]=00');
console.log('\nFazit: 0x00=AN, 0x01=AUS (INVERTIERT!) ✅');
