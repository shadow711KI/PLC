const net = require('net');

// Motor 6 "Arbeiten" Status abfragen
const motorNr = 6;
const host = '192.168.178.234';
const port = 1001;

function buildStatusQueryFrame(motorNr) {
  const frame = Buffer.alloc(24);
  frame[0] = 0x02;           // STX
  frame[1] = 0x13;           // LEN (19 bytes payload)
  frame[2] = 0x41;           // TYPE (query)
  frame[3] = 0x00;           // STATION
  frame[4] = 0x00;           // OPCODE
  frame[5] = 0x01;           // COUNT (1 motor)
  
  // Motor operand - Status-Adresse 6956
  frame[6] = 0x69;
  frame[7] = motorNr + 0x50;  // 6 + 0x50 = 0x56
  frame[8] = 0x00;
  
  // Padding
  for (let i = 9; i < 21; i++) {
    frame[i] = 0x00;
  }
  
  frame[21] = 0x03; // ETX
  
  // Checksum
  let sum = 0;
  for (let i = 0; i < 21; i++) sum += frame[i];
  frame[22] = (sum >> 8) & 0xFF;
  frame[23] = sum & 0xFF;
  
  return frame;
}

console.log('🔌 Verbinde zu SPS1:', host + ':' + port);
console.log('📊 Frage Status ab für Motor 6 "Arbeiten"...\n');

const frame = buildStatusQueryFrame(motorNr);
console.log('📤 Sende:', frame.toString('hex'));
console.log('   Adresse: 6956 (0x6956)\n');

const socket = net.createConnection({ host, port });
let response = Buffer.alloc(0);

socket.on('connect', () => {
  console.log('✅ Verbunden, sende Status-Query...');
  socket.write(frame);
});

socket.on('data', (data) => {
  response = Buffer.concat([response, data]);
  
  if (response.length >= 24) {
    socket.destroy();
    
    console.log('\n📥 Antwort empfangen:', response.toString('hex'));
    console.log('   Bytes:', Array.from(response.slice(0, 12)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    
    const statusByte = response[3];
    const dataByte = response[7];
    const positionValue = response[8];
    
    console.log('\n🔍 Dekodierung:');
    console.log('   Byte[3] StatusByte: 0x' + statusByte.toString(16).padStart(2, '0'));
    console.log('   Byte[7] DataByte:   0x' + dataByte.toString(16).padStart(2, '0'));
    console.log('   Byte[8] Position:   0x' + positionValue.toString(16).padStart(2, '0'), '(' + positionValue + ')');
    
    let position = 'Unbekannt';
    
    if (statusByte === 0x21) {
      if (positionValue === 0x00) {
        position = 'OBEN ⬆️';
      } else if (positionValue === 0xFF) {
        position = 'UNTEN ⬇️';
      } else if (positionValue > 0x00 && positionValue < 0x40) {
        position = 'OBEN ⬆️ (' + Math.round(positionValue / 255 * 100) + '%)';
      } else if (positionValue >= 0x40 && positionValue < 0xC0) {
        position = 'HALB OFFEN ↔️ (' + Math.round(positionValue / 255 * 100) + '%)';
      } else {
        position = 'UNTEN ⬇️ (' + Math.round(positionValue / 255 * 100) + '%)';
      }
      
      const motorStatus = dataByte & 0x0F;
      if (motorStatus === 0x01) {
        position = 'FÄHRT HOCH ⏫';
      } else if (motorStatus === 0x02) {
        position = 'FÄHRT RUNTER ⏬';
      }
    }
    
    console.log('\n✅ STATUS VON "ARBEITEN":');
    console.log('   → ' + position);
    console.log('');
  }
});

socket.on('error', (err) => {
  console.error('❌ Fehler:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('⏱️ Timeout - keine Antwort von SPS');
  socket.destroy();
  process.exit(1);
}, 2000);
