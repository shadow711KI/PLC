#!/usr/bin/env node

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║    SESSIONS #32, #33, #34 VERGLEICH                ║');
console.log('╚════════════════════════════════════════════════════╝\n');

const sessions = {
  32: '02134100000569510069520069530069540069550003F203',
  33: '02134100000569510069520069530069540069550003F203',
  34: '021341000005692100692200692300692400692500030203'
};

Object.entries(sessions).forEach(([num, hex]) => {
  console.log(`\nSession #${num}:`);
  console.log(`  Hex: ${hex}`);
  
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  
  console.log(`  Length: ${bytes.length} bytes`);
  console.log(`  Header: 0x${bytes[0].toString(16).toUpperCase()} 0x${bytes[1].toString(16).toUpperCase()} 0x${bytes[2].toString(16).toUpperCase()} 0x${bytes[3].toString(16).toUpperCase()} 0x${bytes[4].toString(16).toUpperCase()} 0x${bytes[5].toString(16).toUpperCase()}`);
  
  // Extract status bytes
  const statusBytes = [];
  for (let i = 7; i < bytes.length - 3; i += 3) {
    const motorByte = bytes[i];
    const statusByte = bytes[i + 1];
    statusBytes.push(`0x${statusByte.toString(16).toUpperCase()}`);
    console.log(`    Motor ${(statusByte - 0x20).toString()}: 0x${bytes[i].toString(16).toUpperCase()} 0x${statusByte.toString(16).toUpperCase()}`);
  }
});

console.log('\n\nANALYSE:');
console.log('════════\n');

console.log('Session #32 und #33 sind IDENTISCH:');
console.log('  Status-Bytes: 0x51, 0x52, 0x53, 0x54, 0x55');
console.log('  → (-0x50): 1, 2, 3, 4, 5\n');

console.log('Session #34 hat andere Status-Bytes:');
console.log('  Status-Bytes: 0x21, 0x22, 0x23, 0x24, 0x25');
console.log('  → (-0x20): 1, 2, 3, 4, 5\n');

console.log('INTERPRETATION:');
console.log('═══════════════\n');

console.log('Möglichkeit 1: Unterschiedliche Motor-Gruppen');
console.log('  #32/#33: Motors mit 0x50er Offset (z.B. SPS1 Motors?)');
console.log('  #34:     Motors mit 0x20er Offset (z.B. SPS2/SPS3 Motors?)\n');

console.log('Möglichkeit 2: Unterschiedliche Befehle/Actions');
console.log('  0x51-0x55: Status-Abfrage?');
console.log('  0x21-0x25: Ein anderer Befehl?\n');

console.log('Möglichkeit 3: Selections-Status');
console.log('  0x51-0x55: Abfrage "welche Motors sind selektiert?" (Antwort: 1-5)');
console.log('  0x21-0x25: Abfrage "welche Motors sind aktiv?" (Antwort: 1-5)\n');

console.log('NÄCHSTE SCHRITTE:');
console.log('═════════════════');
console.log('1. Test: Session #32/33 Frame an SPS senden → beobachten was passiert');
console.log('2. Test: Session #34 Frame an SPS senden → beobachten was passiert');
console.log('3. Muster im Offset erkunden (0x20 vs 0x50)');
console.log('');
