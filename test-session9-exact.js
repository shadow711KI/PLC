// Test: Session #9 [18:36:42] - Originale App öffnen
// 02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A

const net = require('net');

const SPS1 = { host: '192.168.178.234', port: 1001 };

// Session #9 exakt nachbauen
function buildAppInitQuery() {
  const hexString = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
  return Buffer.from(hexString, 'hex');
}

console.log('\n🧪 Test: Session #9 [18:36:42] - App-Start');
console.log('Erwartet: Motor "Arbeiten" = UNTEN\n');

const frame = buildAppInitQuery();
console.log('📤 Sende:', frame.toString('hex').toUpperCase());
console.log(`   (${frame.length} bytes)\n`);

const client = new net.Socket();
client.setTimeout(3000);

client.on('data', (data) => {
  console.log(`\n✅ ANTWORT ERHALTEN! (${data.length} bytes)`);
  console.log('📥 Hex:', data.toString('hex').toUpperCase());
  
  // Dekodiere die Antwort
  if (data.length > 10) {
    console.log('\n📊 MOTOR-STATUS:');
    // Die Antwort sollte für jeden Motor ein Status-Byte enthalten
    // Byte-Positionen analysieren
    for (let i = 8; i < data.length - 3; i += 3) {
      if (i + 2 < data.length) {
        const addr = (data[i] << 8) | data[i + 1];
        const pos = data[i + 2];
        
        let status;
        if (pos <= 0x3F) status = 'OBEN';
        else if (pos >= 0xC0) status = 'UNTEN';
        else status = `HALB (0x${pos.toString(16).toUpperCase()})`;
        
        console.log(`   Addr 0x${addr.toString(16).toUpperCase()}: ${status} (Byte: 0x${pos.toString(16).toUpperCase()})`);
      }
    }
  }
  
  client.destroy();
  process.exit(0);
});

client.on('timeout', () => {
  console.log('\n⏱️ TIMEOUT - keine Antwort nach 3 Sekunden');
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
