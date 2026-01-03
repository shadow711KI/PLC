// Test: Session #9 mit längerer Wartezeit
const net = require('net');

const SPS1 = { host: '192.168.178.234', port: 1001 };

function buildAppInitQuery() {
  const hexString = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
  return Buffer.from(hexString, 'hex');
}

console.log('\n🧪 Test: Warte auf alle Daten-Pakete...\n');

const client = new net.Socket();
client.setTimeout(5000);

let packetCount = 0;

client.on('data', (data) => {
  packetCount++;
  console.log(`\n📦 Paket #${packetCount} (${data.length} bytes):`);
  console.log('   Hex:', data.toString('hex').toUpperCase());
  
  // Nicht sofort schließen, warten ob mehr kommt
});

client.on('timeout', () => {
  console.log(`\n⏹️ Timeout nach 5 Sekunden - ${packetCount} Pakete empfangen`);
  client.destroy();
  process.exit(0);
});

client.on('error', (err) => {
  console.log('\n❌ Fehler:', err.message);
  process.exit(1);
});

client.on('close', () => {
  console.log('\n🔌 Verbindung geschlossen');
  process.exit(0);
});

client.connect(SPS1.port, SPS1.host, () => {
  console.log(`✅ Verbunden mit ${SPS1.host}:${SPS1.port}`);
  const frame = buildAppInitQuery();
  client.write(frame);
  console.log('✉️ Befehl gesendet, warte 5 Sekunden auf alle Pakete...');
});
