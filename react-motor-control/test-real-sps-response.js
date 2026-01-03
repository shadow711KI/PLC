// Test mit echter SPS-Antwort aus dem Log
const testHex = '0203400021021C4100000680FFF9CD80FFF9CD80FFF9CD80FD10F680F8390280F8190403E10F';
const buffer = Buffer.from(testHex, 'hex');

console.log('📡 Teste echte SPS-Antwort vom 14:06:37');
console.log('HEX:', testHex);
console.log('Länge:', buffer.length, 'bytes\n');

// Decodiere wie im Parser
function decodeTimepoint(bytes) {
  // Wochentage aus byte 1 und byte 2
  const sa = (bytes[1] >> 2) & 1;
  const fr = (bytes[1] >> 1) & 1;
  const do_ = (bytes[1] >> 0) & 1;
  const mi = (bytes[2] >> 7) & 1;
  const di = (bytes[2] >> 6) & 1;
  const mo = (bytes[2] >> 5) & 1;
  const so = (bytes[2] >> 4) & 1;
  
  const weekdays = [];
  if (mo) weekdays.push('Mo');
  if (di) weekdays.push('Di');
  if (mi) weekdays.push('Mi');
  if (do_) weekdays.push('Do');
  if (fr) weekdays.push('Fr');
  if (sa) weekdays.push('Sa');
  if (so) weekdays.push('So');
  
  // Stunde aus bits h0-h4
  const h0 = (bytes[2] >> 0) & 1;
  const h1 = (bytes[2] >> 1) & 1;
  const h2 = (bytes[2] >> 2) & 1;
  const h3 = (bytes[2] >> 3) & 1;
  const h4 = (bytes[3] >> 7) & 1;
  const hourBits = `${h4}${h3}${h2}${h1}${h0}`;
  const hour = (h4 << 0) | (h3 << 1) | (h2 << 2) | (h1 << 3) | (h0 << 4);
  
  // Minute aus byte 3, bits 6-1
  const m0 = (bytes[3] >> 6) & 1;
  const m1 = (bytes[3] >> 5) & 1;
  const m2 = (bytes[3] >> 4) & 1;
  const m3 = (bytes[3] >> 3) & 1;
  const m4 = (bytes[3] >> 2) & 1;
  const m5 = (bytes[3] >> 1) & 1;
  const minuteBits = `${m0}${m1}${m2}${m3}${m4}${m5}`;
  const minute = (m0 << 5) | (m1 << 4) | (m2 << 3) | (m3 << 2) | (m4 << 1) | (m5 << 0);
  
  // Aktiviert aus byte 3, bit 0
  const enabled = (bytes[3] & 0x01) === 1;
  const action = enabled ? 'runter' : 'hoch';
  
  return {
    raw: Array.from(bytes).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(''),
    weekdays: weekdays.join(','),
    hourBits,
    hour: hour <= 23 ? hour : null,
    minuteBits,
    minute: minute <= 59 ? minute : null,
    enabled: enabled ? 'ja' : 'nein',
    action
  };
}

// Finde Datenstart nach ACK-Frame
const ackFrame = buffer.slice(0, 5); // 0203400021
const dataFrame = buffer.slice(5);   // Rest

console.log('ACK Frame:', ackFrame.toString('hex').toUpperCase());
console.log('Data Frame:', dataFrame.toString('hex').toUpperCase(), '\n');

// Parse Data Frame: 02 1C 41 00 00 06 [6 Zeitpunkte] 03 [checksum]
// Daten starten bei Offset 6
const dataStart = 6;

console.log('┌────┬──────────┬────────────────┬──────────┬──────┬────────────┬──────┬──────────┬────────┐');
console.log('│ ID │   RAW    │   Wochentage   │ h-Bits   │ Std  │  m-Bits    │ Min  │ aktiviert│ Aktion │');
console.log('├────┼──────────┼────────────────┼──────────┼──────┼────────────┼──────┼──────────┼────────┤');

for (let i = 0; i < 6; i++) {
  const offset = dataStart + (i * 4); // Jeder Zeitpunkt = 4 Bytes (kein Gap in Response!)
  const bytes = dataFrame.slice(offset, offset + 4);
  
  if (bytes.length === 4) {
    const tp = decodeTimepoint(bytes);
    const hourStr = tp.hour !== null ? String(tp.hour).padStart(2, '0') : '--';
    const minStr = tp.minute !== null ? String(tp.minute).padStart(2, '0') : '--';
    const timeStr = tp.hour !== null && tp.minute !== null ? `${hourStr}:${minStr}` : '';
    
    console.log(`│ ${i+1}  │ ${tp.raw} │ ${tp.weekdays.padEnd(14)} │ ${tp.hourBits} │ ${hourStr}   │ ${tp.minuteBits} │ ${minStr}   │ ${tp.enabled.padEnd(8)} │ ${tp.action.padEnd(6)} │${timeStr ? ' ' + timeStr : ''}`);
  }
}

console.log('└────┴──────────┴────────────────┴──────────┴──────┴────────────┴──────┴──────────┴────────┘');
