// Analyse der 36-Byte SPS-Antwort auf 72-Byte Status-Query
const hex = '021F41000015010001000100010001000100010001000100010001000000000000036100';
const bytes = Buffer.from(hex, 'hex');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('36-BYTE RESPONSE ANALYSE (Status-Query Antwort)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nHEADER:');
console.log('  STX:      0x' + bytes[0].toString(16).padStart(2,'0'));
console.log('  LEN:      0x' + bytes[1].toString(16).padStart(2,'0'), '=', bytes[1], 'bytes Payload');
console.log('  TYP:      0x' + bytes[2].toString(16).padStart(2,'0'));
console.log('  BEF:      0x' + bytes[3].toString(16).padStart(2,'0'), '0x' + bytes[4].toString(16).padStart(2,'0'));
console.log('  COUNT:    0x' + bytes[5].toString(16).padStart(2,'0'), '=', bytes[5], 'Werte');

console.log('\n\nDATA (21 Werte):');
console.log('─────────────────────────────────────────────────────');

// Die ersten 12 Werte sind Position-Status (je 1 Byte)
console.log('\n📍 POSITION-STATUS (12 Bytes für 6 Motoren):');
for (let i = 0; i < 12; i++) {
  const motorNr = Math.floor(i / 2) + 1;
  const type = (i % 2 === 0) ? 'Oben/Unten' : 'Position';
  const value = bytes[6 + i];
  console.log(`  Motor ${motorNr} ${type.padEnd(10)}: 0x${value.toString(16).padStart(2,'0')} = ${value}`);
}

// Die nächsten 6 Werte sind Automatik Ein/Aus (je 1 Byte)
console.log('\n⚙️  AUTOMATIK EIN/AUS (6 Bytes für 6 Motoren):');
for (let i = 0; i < 6; i++) {
  const motorNr = i + 1;
  const value = bytes[18 + i];
  const status = value === 0x01 ? 'AN ✓' : value === 0x00 ? 'AUS ✗' : `UNBEKANNT (0x${value.toString(16)})`;
  console.log(`  Motor ${motorNr} Automatik: 0x${value.toString(16).padStart(2,'0')} = ${status}`);
}

// Die letzten 3 Werte sind weitere Status-Bytes
console.log('\n📊 WEITERE STATUS (3 Bytes):');
for (let i = 0; i < 3; i++) {
  const value = bytes[24 + i];
  console.log(`  Status ${i+1}: 0x${value.toString(16).padStart(2,'0')} = ${value}`);
}

console.log('\n\nFOOTER:');
const etxPos = bytes.length - 3;
console.log('  ETX:      0x' + bytes[etxPos].toString(16).padStart(2,'0'));
console.log('  CHECKSUM: 0x' + bytes[etxPos+1].toString(16).padStart(2,'0') + bytes[etxPos+2].toString(16).padStart(2,'0'));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('INTERPRETATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Diese Response enthält für 6 Motoren:');
console.log('  - Position-Status (oben/unten) - Bytes 6-17');
console.log('  - Automatik Ein/Aus Status - Bytes 18-23');
console.log('  - Weitere Status-Werte - Bytes 24-26');
console.log('\nAutomatik-Status:');
console.log('  0x01 = AN (Zeitautomatik aktiviert)');
console.log('  0x00 = AUS (Zeitautomatik deaktiviert)');

// Analysiere alle Beispiele
console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('VERGLEICH MEHRERER RESPONSES:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const examples = [
  '021F41000015010001000100010001000100010001000100010001000000000000036100',
  '021F41000015000000000100010000000000010001000100010001000000000000035D00',
  '021F41000015000000000100010000000000000001000100010001000000000000035C00',
  '021F41000015000000000100010000000000000000000100010001000000000000035B00'
];

examples.forEach((ex, idx) => {
  const b = Buffer.from(ex, 'hex');
  console.log(`\nBeispiel ${idx + 1}:`);
  const automatikBytes = b.slice(18, 24);
  console.log('  Automatik-Bytes:', automatikBytes.map(v => '0x' + v.toString(16).padStart(2,'0')).join(' '));
  console.log('  Motoren AN:', automatikBytes.map((v, i) => v === 0x01 ? `M${i+1}` : null).filter(x => x).join(', ') || 'keine');
  console.log('  Motoren AUS:', automatikBytes.map((v, i) => v === 0x00 ? `M${i+1}` : null).filter(x => x).join(', ') || 'keine');
});
