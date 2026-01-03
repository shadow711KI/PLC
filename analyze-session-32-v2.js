#!/usr/bin/env node

// Bessere Analyse von Session #32
const hex = "02134100000569510069520069530069540069550003F203";
const bytes = [];
for (let i = 0; i < hex.length; i += 2) {
  bytes.push(parseInt(hex.substring(i, i + 2), 16));
}

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║         SESSION #32 FRAME - ALTERNATIVE ANALYSE    ║');
console.log('╚════════════════════════════════════════════════════╝\n');

console.log('Hex:', hex);
console.log('Length:', bytes.length, 'bytes\n');

console.log('HYPOTHESE: Multi-Motor Abfrage/Befehl ohne individuelle Status\n');

// Header
console.log('Header (Bytes 0-5):');
console.log(`  0x02 = STX`);
console.log(`  0x13 = LEN (19 bytes payload)`);
console.log(`  0x41 = TYP (Standard)`);
console.log(`  0x00 = STATION`);
console.log(`  0x00 = ??`);
console.log(`  0x05 = Count? (5 Motors?)\n`);

// Motor-IDs
console.log('Motor-Daten (Bytes 6-20):');
const motorIds = [];
for (let i = 6; i < 21; i++) {
  const byte = bytes[i];
  if (byte === 0x00) {
    console.log(`  Byte ${i}: 0x00 (Separator/Padding)`);
  } else {
    console.log(`  Byte ${i}: 0x${byte.toString(16).toUpperCase().padStart(2, '0')} = ${byte}`);
    
    // Versuche zu dekodieren
    if ((byte & 0xF0) === 0x50) {
      // 0x50-0x55 Pattern
      const val = byte & 0x0F;
      motorIds.push(byte);
      console.log(`    → Könnte eine Motor-ID oder Status-Info sein: 0x${byte.toString(16).toUpperCase()}`);
    } else if ((byte & 0xF0) === 0x60 || byte === 0x69) {
      motorIds.push(byte);
      console.log(`    → Motor-Byte: 0x${byte.toString(16).toUpperCase()} (0x69 = Motor-Präfix?)`);
    }
  }
}

console.log(`\nExtrahierte Non-Zero Bytes: ${motorIds.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ')}`);

console.log('\n\nHYPOTHESE 2: Sequenzielles Format\n');
console.log('Bytes 6-20 könnten ein Pattern sein:');
console.log('  0x69 0x51 0x00 = Motor-Info 1 (Motor ?? + Status 0x51)?');
console.log('  0x69 0x52 0x00 = Motor-Info 2 (Motor ?? + Status 0x52)?');
console.log('  0x69 0x53 0x00 = Motor-Info 3 (Motor ?? + Status 0x53)?');
console.log('  0x69 0x54 0x00 = Motor-Info 4 (Motor ?? + Status 0x54)?');
console.log('  0x69 0x55 0x00 = Motor-Info 5 (Motor ?? + Status 0x55)?\n');

// Status-Bytes analysieren
const statuses = [0x51, 0x52, 0x53, 0x54, 0x55];
console.log('Status-Bytes Muster:');
statuses.forEach((s, idx) => {
  console.log(`  ${idx + 1}. 0x${s.toString(16).toUpperCase()} = ${s} (dezimal) = 0x${(s - 0x50).toString(16).toUpperCase()} von 0x50`);
  console.log(`     → Könnte Motor ${s - 0x50} mit Status-Code bedeuten?`);
});

console.log('\n\nKONCLUSION:');
console.log('═══════════');
console.log('Session #32 scheint ein Frame zu sein der:');
console.log('- 5 Motors gleichzeitig abfragt oder kontrolliert');
console.log('- Jeder Motor: 0x69 + Status-Byte (0x51-0x55) + 0x00 (padding)');
console.log('- Status-Bytes steigen von 0x51 bis 0x55 (fünf unterschiedliche Werte)');
console.log('\nDas könnte bedeuten: Status-Abfrage von 5 Motors gleichzeitig!\n');
