#!/usr/bin/env node

// Analysiere Session #32 Frame
const hex = "02134100000569510069520069530069540069550003F203";
const bytes = [];
for (let i = 0; i < hex.length; i += 2) {
  bytes.push(parseInt(hex.substring(i, i + 2), 16));
}

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║         SESSION #32 FRAME ANALYSE                  ║');
console.log('╚════════════════════════════════════════════════════╝\n');

console.log('Hex:', hex);
console.log('Length:', bytes.length, 'bytes\n');

console.log('Struktur:');
console.log(`  Byte 0 (STX):    0x${bytes[0].toString(16).toUpperCase().padStart(2, '0')} = ${bytes[0]} (Start of Text)`);
console.log(`  Byte 1 (LEN):    0x${bytes[1].toString(16).toUpperCase().padStart(2, '0')} = ${bytes[1]} (Payload länge)`);

console.log('\nPayload (Bytes 2-' + (bytes.length - 3) + '):');
const payloadStart = 2;
const payloadEnd = bytes.length - 3; // Ohne ETX und Checksum

for (let i = payloadStart; i <= payloadEnd; i++) {
  console.log(`  Byte ${i}: 0x${bytes[i].toString(16).toUpperCase().padStart(2, '0')} = ${bytes[i]}`);
}

console.log(`\n  Byte ${bytes.length - 3} (ETX):     0x${bytes[bytes.length - 3].toString(16).toUpperCase().padStart(2, '0')} = ${bytes[bytes.length - 3]} (End of Text)`);
console.log(`  Bytes ${bytes.length - 2}-${bytes.length - 1} (CKSUM):  0x${bytes[bytes.length - 2].toString(16).toUpperCase().padStart(2, '0')}${bytes[bytes.length - 1].toString(16).toUpperCase().padStart(2, '0')}`);

console.log('\n\nDETAILLIERTE ANALYSE:');
console.log('═════════════════════\n');

// Header analyse
console.log('Header (Bytes 2-5):');
console.log(`  0x41 0x00 0x00 0x05`);
console.log(`  → TYP: 0x41`);
console.log(`  → STATION: 0x00`);
console.log(`  → ??: 0x00`);
console.log(`  → ??: 0x05\n`);

// Motor-Daten analyse
console.log('Motor-Daten (Bytes 6-20):');
const motorData = [];
for (let i = 6; i <= 20; i += 2) {
  const motorByte = bytes[i];
  const statusByte = bytes[i + 1];
  
  // Versuche Motor aus den Bytes zu berechnen
  const motorNum = (motorByte - 0x69) / 0x10 + 1;
  const status = statusByte & 0x0F;
  
  console.log(`  Bytes ${i}-${i + 1}: 0x${motorByte.toString(16).toUpperCase().padStart(2, '0')} 0x${statusByte.toString(16).toUpperCase().padStart(2, '0')}`);
  console.log(`    → Motor-Byte: 0x${motorByte.toString(16).toUpperCase().padStart(2, '0')}`);
  console.log(`    → Status-Byte: 0x${statusByte.toString(16).toUpperCase().padStart(2, '0')}`);
  
  // Versuch zu dekodieren
  if (motorByte >= 0x69) {
    const idx = (motorByte - 0x69) / 0x10;
    console.log(`    → Möglich: Motor ${idx + 1}, Status: 0x${statusByte.toString(16).toUpperCase().padStart(2, '0')}`);
  }
  console.log('');
}

// Checksum berechnen
console.log('\nChecksum Verifikation:');
let sum = 0;
for (let i = 1; i < bytes.length - 2; i++) {
  sum += bytes[i];
}
const calcCkLow = sum & 0xFF;
const calcCkHigh = (sum >> 8) & 0xFF;
const actualCkLow = bytes[bytes.length - 2];
const actualCkHigh = bytes[bytes.length - 1];

console.log(`  Berechnet: 0x${calcCkHigh.toString(16).toUpperCase().padStart(2, '0')}${calcCkLow.toString(16).toUpperCase().padStart(2, '0')}`);
console.log(`  Aktuell:   0x${actualCkHigh.toString(16).toUpperCase().padStart(2, '0')}${actualCkLow.toString(16).toUpperCase().padStart(2, '0')}`);
console.log(`  ${calcCkLow === actualCkLow && calcCkHigh === actualCkHigh ? '✓ OK' : '✗ FEHLER'}\n`);

console.log('\nFRAME-TYP: Multi-Motor Befehl');
console.log('Beschreibung: Scheint ein Befehl für mehrere Motors gleichzeitig zu sein');
console.log('             Jedes Motor hat ein Motor-Byte und Status-Byte Paar\n');
