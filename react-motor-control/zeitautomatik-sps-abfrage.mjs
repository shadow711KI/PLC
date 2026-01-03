// Programm: Zeitautomatik von SPS abfragen und Ergebnis anzeigen
// Voraussetzung: SPS ist im Netzwerk erreichbar, Backend-Logik aus index.ts wird hier minimal nachgebaut
// Port/Host ggf. anpassen!


import net from 'net';

// SPS-Ziel (aus App-Konfiguration)
const SPS_HOST = '192.168.178.234';
const SPS_PORT = 1001;

// Echten Read-Frame aus Log verwenden (HEX aus Log, Zeile 52):
const logHex = '021641000006695700695800695900695A00695B00695C0003D604';


function hexToBuffer(hex) {
  return Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
}

// Parserfunktion (wie im Testskript)
function parseZeitautomatikResponse(buffer) {
  if (!buffer || buffer.length < 10) return [];
  try {
    const headerPattern = Buffer.from([0x41, 0x00, 0x00, 0x06]);
    let patternIndex = buffer.indexOf(headerPattern);
    let dataStart = patternIndex !== -1 ? patternIndex + headerPattern.length : 12;
    const timePoints = [];
    for (let i = 0; i < 6; i++) {
      const offset = dataStart + (i * 4);
      if (offset + 4 > buffer.length) {
        timePoints.push({ id: i + 1, weekdayMask: null, hour: null, minute: null, action: 'unbekannt', enabled: false, raw: [null, null, null, null], info: 'Keine Daten empfangen' });
        continue;
      }
      const bytes = buffer.slice(offset, offset + 4);
      const weekdayMask = bytes[0];
      const b1 = bytes[1];
      const b2 = bytes[2];
      const b3 = bytes[3];
      const raw = [weekdayMask, b1, b2, b3];
      const enabled = (weekdayMask > 0);
      let hour = (b1 >= 0 && b1 <= 23) ? b1 : null;
      let minute = (b2 >= 0 && b2 <= 59) ? b2 : null;
      let action = 'unbekannt';
      if (b3 === 1) action = 'hoch';
      else if (b3 === 2) action = 'runter';
      let info = '';
      if (hour === null) info += 'Stunde ungültig; ';
      if (minute === null) info += 'Minute ungültig; ';
      if (!enabled) info += 'Zeitpunkt deaktiviert; ';
      if (action === 'unbekannt') info += 'Aktion unbekannt; ';
      timePoints.push({ id: i + 1, weekdayMask, hour, minute, action, enabled, raw, info: info.trim() });
    }
    return timePoints;
  } catch (error) {
    return Array.from({ length: 6 }, (_, i) => ({ id: i + 1, weekdayMask: null, hour: null, minute: null, action: 'unbekannt', enabled: false, raw: [null, null, null, null], info: 'Parser-Fehler' }));
  }
}

function main() {
  const frame = hexToBuffer(logHex);
  console.log('Sende Zeitautomatik-Read-Frame aus Log an SPS:', frame.toString('hex'));
  const client = new net.Socket();
  client.connect(SPS_PORT, SPS_HOST, () => {
    client.write(frame);
  });
  let response = Buffer.alloc(0);
  client.on('data', (data) => {
    response = Buffer.concat([response, data]);
  });
  client.on('end', () => {
    console.log('Antwort von SPS (HEX):', response.toString('hex'));
    const result = parseZeitautomatikResponse(response);
    console.log('Dekodierte Zeitpunkte:');
    console.dir(result, { depth: null });
  });
  client.on('error', (err) => {
    console.error('Fehler bei Verbindung zur SPS:', err.message);
  });
  setTimeout(() => {
    client.end();
  }, 2000); // Timeout nach 2s
}

main();
