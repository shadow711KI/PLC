// Zeitautomatik-Parser nach Doku-Bitmuster (Bitfeld über 4 Bytes)
// Test: Dekodiere alle drei Telegramme aus dem Log

const testTelegrams = [

  // Beispiel: [19:38:00] Befehl #9
  '80FFF9CD69580080FFF9CD69590080FFF9CD695A0080FD10F6695B0080F83902695C0080F81904'
];

function hexToBuffer(hex) {
  return Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
}

function decodeTimepoint(bytes) {
  // Neue Bitzuordnung: Wochentage aus byte 1 und byte 2
  const sa = (bytes[1] >> 2) & 1;
  const fr = (bytes[1] >> 1) & 1;
  const do_ = (bytes[1] >> 0) & 1;
  const mi = (bytes[2] >> 7) & 1;
  const di = (bytes[2] >> 6) & 1;
  const mo = (bytes[2] >> 5) & 1;
  const so = (bytes[2] >> 4) & 1;
  const weekdays = [];
  if (sa) weekdays.push('Sa');
  if (fr) weekdays.push('Fr');
  if (do_) weekdays.push('Do');
  if (mi) weekdays.push('Mi');
  if (di) weekdays.push('Di');
  if (mo) weekdays.push('Mo');
  if (so) weekdays.push('So');
  // Stunde aus ursprünglichen Bits
  const h0 = (bytes[2] >> 0) & 1;
  const h1 = (bytes[2] >> 1) & 1;
  const h2 = (bytes[2] >> 2) & 1;
  const h3 = (bytes[2] >> 3) & 1;
  const h4 = (bytes[3] >> 7) & 1;
  const hourRaw = (h4 << 0) | (h3 << 1) | (h2 << 2) | (h1 << 3) | (h0 << 4);
  const hourBitsString = `${h0}${h1}${h2}${h3}${h4}`;
  let hour = null;
  if (hourRaw >= 0 && hourRaw <= 23) {
    hour = hourRaw;
  }

  // Minute aus byte 3, Bits 6 bis 1
  const m0 = (bytes[3] >> 6) & 1;
  const m1 = (bytes[3] >> 5) & 1;
  const m2 = (bytes[3] >> 4) & 1;
  const m3 = (bytes[3] >> 3) & 1;
  const m4 = (bytes[3] >> 2) & 1;
  const m5 = (bytes[3] >> 1) & 1;
  const minuteRaw = (m0 << 5) | (m1 << 4) | (m2 << 3) | (m3 << 2) | (m4 << 1) | (m5 << 0);
  const minuteBitsString = `${m0}${m1}${m2}${m3}${m4}${m5}`;
  let minute = null;
  if (minuteRaw >= 0 && minuteRaw <= 59) {
    minute = minuteRaw;
  }
  const status = bytes[3];

  const isOn = (status & 0x01) === 1;
  const isUp = (status & 0x02) === 0x02;
  const enabled = isOn;
  let action = enabled ? 'runter' : 'hoch';

  let info = '';
  if (hour === null) info += 'Stunde ungültig; ';
  if (minute === null) info += 'Minute ungültig; ';
  if (!enabled) info += 'Zeitpunkt deaktiviert; ';
  if (!action) info += 'Aktion unbekannt; ';

  return {
    weekdays,
    hour,
    hourRaw,
    hourBits: hourBitsString,
    minute,
    minuteRaw,
    minuteBits: minuteBitsString,
    action,
    enabled,
    raw: Array.from(bytes),
    info: info.trim()
  };
}

function printTable(results, label) {
  console.log(`\n=== ${label} ===`);
  console.log('Nr | Raw Bytes   | Wochentage           | Stunde | Minute | Aktion   | Aktiviert | Info');
  console.log('---+-------------+----------------------+--------+--------+----------+-----------+--------------------------------------------');
  results.forEach((tp, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)} | ` +
      `${tp.raw.map(b => b.toString(16).padStart(2, '0')).join(' ')} | ` +
      `${tp.weekdays.join(',').padEnd(20)} | ` +
      `${tp.hour === null ? '--' : tp.hour.toString().padStart(2)}     | ` +
      `${tp.minute === null ? '--' : tp.minute.toString().padStart(2)}     | ` +
      `${tp.action.padEnd(8)} | ` +
      `${tp.enabled ? 'ja ' : 'nein'}      | ` +
      `${tp.info}`
    );
  });
}

function main() {
  testTelegrams.forEach((hex, idx) => {
    const buf = hexToBuffer(hex);
    const results = [];
    let i = 0;
    while (i + 4 <= buf.length && results.length < 6) {
      results.push(decodeTimepoint(buf.slice(i, i + 4)));
      i += 4;
      i += 3; // 3 Bytes überspringen
    }
    printTable(results, `Telegramm ${idx + 1}`);
  });
}

main();
