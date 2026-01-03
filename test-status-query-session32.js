// Test: Session #32 Format - Reiner Status-Query
// 02134100000569510069520069530069540069550003F203

const net = require('net');

const SPS1 = { host: '192.168.178.234', port: 1001 };

// Session #32 nachbauen für Motor 6 "Arbeiten" = Status 6956
function buildPureStatusQuery() {
  const frame = Buffer.alloc(12);
  frame[0] = 0x02;   // STX
  frame[1] = 0x07;   // LEN (7 bytes payload für 1 Motor)
  frame[2] = 0x41;   // TYPE
  frame[3] = 0x00;   // STATION
  frame[4] = 0x00;   // OPCODE = 0x00 (Status-Query!)
  frame[5] = 0x01;   // COUNT = 1
  
  // Status-Adresse Motor 6
  frame[6] = 0x69;
  frame[7] = 0x56;
  frame[8] = 0x00;
  
  frame[9] = 0x03;  // ETX
  
  // Checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += frame[i];
  frame[10] = (sum >> 8) & 0xFF;
  frame[11] = sum & 0xFF;
  
  return frame;
}

console.log('\n🧪 Test: Session #32 Format (reiner Status-Query)');
console.log('Motor: Arbeiten (Status 6956)\n');

const frame = buildPureStatusQuery();
console.log('📤 Sende:', frame.toString('hex').toUpperCase());
console.log('   Format: 0207410000016956000301xx\n');

const client = new net.Socket();
client.setTimeout(2000);

client.on('data', (data) => {
  console.log(`\n✅ ANTWORT ERHALTEN! (${data.length} bytes)`);
  console.log('📥 Hex:', data.toString('hex').toUpperCase());
  
  if (data.length >= 10) {
    const pos = data[8];
    let status;
    if (pos <= 0x3F) status = 'OBEN';
    else if (pos >= 0xC0) status = 'UNTEN';
    else status = `HALB OFFEN (${pos.toString(16).toUpperCase()})`;
    
    console.log(`\n🎯 Motor "Arbeiten": ${status}`);
  }
  
  client.destroy();
  process.exit(0);
});

client.on('timeout', () => {
  console.log('\n⏱️ TIMEOUT - keine Antwort');
  client.destroy();
  process.exit(1);
});

client.on('error', (err) => {
  console.log('\n❌ Fehler:', err.message);
  process.exit(1);
});

client.connect(SPS1.port, SPS1.host, () => {
  console.log(`✅ Verbunden mit ${SPS1.host}:${SPS1.port}`);
  client.write(frame);
  console.log('✉️ Befehl gesendet, warte auf Antwort...');
});
