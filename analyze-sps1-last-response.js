// Analyse der letzten SPS1 Status-Response
const hex = '021f41000015000000000100010000000000010001000100010001000100000000035e00';
const buffer = Buffer.from(hex, 'hex');

console.log('=== SPS1 Status Response Analyse ===\n');
console.log('Gesamt-Länge:', buffer.length, 'bytes');
console.log('HEX:', hex);
console.log('\n--- Frame-Struktur ---');
console.log('STX:', buffer[0].toString(16).padStart(2, '0'));
console.log('LEN:', buffer[1].toString(16).padStart(2, '0'), `(${buffer[1]} bytes)`);
console.log('TYP:', buffer[2].toString(16).padStart(2, '0'));
console.log('Befehl:', buffer[3].toString(16).padStart(2, '0'), buffer[4].toString(16).padStart(2, '0'));
console.log('COUNT:', buffer[5].toString(16).padStart(2, '0'), `(${buffer[5]} Werte)`);

console.log('\n--- Position-Bytes (Offset 6-17, 12 bytes = 6 Motoren × 2 bytes) ---');
for (let i = 0; i < 6; i++) {
  const offset = 6 + (i * 2);
  const byte1 = buffer[offset];
  const byte2 = buffer[offset + 1];
  console.log(`Motor ${i+1}: [${offset}]=${byte1.toString(16).padStart(2, '0')} [${offset+1}]=${byte2.toString(16).padStart(2, '0')}`);
}

console.log('\n--- Automatik-Bytes (verschiedene Interpretationen) ---');
console.log('\n1️⃣ VARIANTE 1: 1 Byte pro Motor (Offset 18-23):');
for (let i = 0; i < 6; i++) {
  const offset = 18 + i;
  const value = buffer[offset];
  console.log(`Motor ${i+1}: [${offset}]=${value.toString(16).padStart(2, '0')} → ${value === 0x01 ? 'AN ✅' : 'AUS ❌'}`);
}

console.log('\n2️⃣ VARIANTE 2: 2 Bytes pro Motor (Offset 18-29):');
for (let i = 0; i < 6; i++) {
  const offset = 18 + (i * 2);
  const byte1 = buffer[offset];
  const byte2 = buffer[offset + 1];
  console.log(`Motor ${i+1}: [${offset}]=${byte1.toString(16).padStart(2, '0')} [${offset+1}]=${byte2.toString(16).padStart(2, '0')} → ${byte1 === 0x01 ? 'AN ✅' : 'AUS ❌'}`);
}

console.log('\n--- Alle Bytes ab Position 18 ---');
const restBytes = [];
for (let i = 18; i < buffer.length - 3; i++) {
  restBytes.push(buffer[i].toString(16).padStart(2, '0'));
}
console.log('Bytes 18-32:', restBytes.join(' '));

console.log('\n--- ETX + Checksum ---');
console.log('ETX:', buffer[buffer.length - 3].toString(16).padStart(2, '0'));
console.log('Checksum:', buffer[buffer.length - 2].toString(16).padStart(2, '0'), buffer[buffer.length - 1].toString(16).padStart(2, '0'));
