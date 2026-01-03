// Decode Zeitautomatik WRITE Frame
// Frame-Format: 02 [LEN] 41 00 01 06 [6x Operands] 03 [checksum]
// Operand-Format: 69 [addr] 00 [d0] [d1] [d2] [d3] (7 bytes)

const writeFrame = '022e41000106695700800576806958008007f9cc6959008007f9cc695a00800510f7695b0080003903695c008000390503f00d';

function hexToBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

function decodeWriteFrame(hexString) {
  const bytes = hexToBytes(hexString);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('WRITE FRAME ANALYSE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('HEX:', hexString);
  console.log('Länge:', bytes.length, 'bytes');
  console.log();
  
  // Header
  const STX = bytes[0];
  const LEN = bytes[1];
  const TYP = bytes[2];
  const STATION = bytes[3];
  const OPCODE = bytes[4];
  const COUNT = bytes[5];
  
  console.log('HEADER:');
  console.log(`  STX: 0x${STX.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log(`  LEN: ${LEN} (0x${LEN.toString(16).padStart(2, '0').toUpperCase()})`);
  console.log(`  TYP: 0x${TYP.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log(`  STATION: 0x${STATION.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log(`  OPCODE: 0x${OPCODE.toString(16).padStart(2, '0').toUpperCase()} (${OPCODE === 0x01 ? 'WRITE' : 'READ'})`);
  console.log(`  COUNT: ${COUNT} Zeitpunkte`);
  console.log();
  
  // Operanden (ab Byte 6, je 7 Bytes)
  const operands = [];
  for (let i = 0; i < COUNT; i++) {
    const offset = 6 + (i * 7);
    const opcode = bytes[offset];
    const addr = bytes[offset + 1];
    const gap = bytes[offset + 2];
    const d0 = bytes[offset + 3];
    const d1 = bytes[offset + 4];
    const d2 = bytes[offset + 5];
    const d3 = bytes[offset + 6];
    
    // Dekodierung nach buildZeitautomatikWriteFrame Logik
    // byte0 (d0) = immer 0x80
    // byte1 (d1) = (sa << 2) | (fr << 1) | (do << 0)
    // byte2 (d2) = (mi << 7) | (di << 6) | (mo << 5) | (so << 4) | (h3 << 3) | (h2 << 2) | (h1 << 1) | (h0 << 0)
    // byte3 (d3) = (h4 << 7) | (m0 << 6) | (m1 << 5) | (m2 << 4) | (m3 << 3) | (m4 << 2) | (m5 << 1) | (enabled << 0)
    
    const sa = !!(d1 & 0x04);
    const fr = !!(d1 & 0x02);
    const do_ = !!(d1 & 0x01);
    
    const mi = !!(d2 & 0x80);
    const di = !!(d2 & 0x40);
    const mo = !!(d2 & 0x20);
    const so = !!(d2 & 0x10);
    const h0 = !!(d2 & 0x01); // MSB
    const h1 = !!(d2 & 0x02);
    const h2 = !!(d2 & 0x04);
    const h3 = !!(d2 & 0x08);
    
    const h4 = !!(d3 & 0x80); // LSB
    const m0 = !!(d3 & 0x40); // MSB
    const m1 = !!(d3 & 0x20);
    const m2 = !!(d3 & 0x10);
    const m3 = !!(d3 & 0x08);
    const m4 = !!(d3 & 0x04);
    const m5 = !!(d3 & 0x02); // LSB
    const enabled = !!(d3 & 0x01);
    
    // Stunde rekonstruieren (h0=MSB, h4=LSB)
    const stunde = (h0 ? 16 : 0) + (h1 ? 8 : 0) + (h2 ? 4 : 0) + (h3 ? 2 : 0) + (h4 ? 1 : 0);
    
    // Minute rekonstruieren (m0=MSB, m5=LSB)
    const minute = (m0 ? 32 : 0) + (m1 ? 16 : 0) + (m2 ? 8 : 0) + (m3 ? 4 : 0) + (m4 ? 2 : 0) + (m5 ? 1 : 0);
    
    // Aktion (enabled=1 → runter, enabled=0 → hoch)
    const aktion = enabled ? 'runter' : 'hoch';
    
    // Wochentage
    const weekdays = [];
    if (so) weekdays.push('So');
    if (mo) weekdays.push('Mo');
    if (di) weekdays.push('Di');
    if (mi) weekdays.push('Mi');
    if (do_) weekdays.push('Do');
    if (fr) weekdays.push('Fr');
    if (sa) weekdays.push('Sa');
    
    operands.push({
      nr: i + 1,
      opcode,
      addr,
      gap,
      data: [d0, d1, d2, d3],
      stunde,
      minute,
      aktion,
      weekdays
    });
  }
  
  // Ausgabe
  console.log('ZEITPUNKTE:');
  console.log('───────────────────────────────────────────────────────');
  operands.forEach(op => {
    const time = `${op.stunde.toString().padStart(2, '0')}:${op.minute.toString().padStart(2, '0')}`;
    const days = op.weekdays.length > 0 ? op.weekdays.join(',') : '---';
    const dataHex = op.data.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    console.log(`Zeitpunkt ${op.nr}:`);
    console.log(`  Adresse: 0x${op.addr.toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`  Daten: ${dataHex}`);
    console.log(`  Zeit: ${time} ${op.aktion}`);
    console.log(`  Wochentage: ${days}`);
    console.log();
  });
  
  // Footer
  const footerOffset = 6 + (COUNT * 7);
  const ETX = bytes[footerOffset];
  const CKSUM_LOW = bytes[footerOffset + 1];
  const CKSUM_HIGH = bytes[footerOffset + 2];
  
  console.log('FOOTER:');
  console.log(`  ETX: 0x${ETX.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log(`  Checksum: 0x${CKSUM_HIGH.toString(16).padStart(2, '0').toUpperCase()}${CKSUM_LOW.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log('═══════════════════════════════════════════════════════');
}

decodeWriteFrame(writeFrame);
