// tcp-hex-opcodes-test.js
// Testet verschiedene Operand-Codes, um zu finden, welcher akzeptiert wird

import net from 'node:net';

// Verschiedene Operand-Codes zum Testen
const OPCODES = {
  0x48: 'BYTE (Schreiben)',
  0x69: 'AUTO (Automatik)',
  0x50: 'DWORD',
  0x40: 'unbekannt 0x40',
  0x42: 'unbekannt 0x42',
  0x5A: 'unbekannt 0x5A'
};

function buildHex(opcode, status = 0x02) {
  // 02 06 41 00 01 <opcode> <status> 00 06 03 <cksum> <cksum>
  const bytes = [0x02, 0x06, 0x41, 0x00, 0x01, opcode, status, 0x00, 0x06, 0x03];
  let sum = 0;
  for (let i = 2; i < 9; i++) sum += bytes[i];
  bytes.push(sum & 0xFF, (sum >> 8) & 0xFF);
  return Buffer.from(bytes).toString('hex');
}

console.log('Teste verschiedene Operand-Codes mit Motor "Arbeiten" (0x00, 0x06):\n');

let testIndex = 0;
const opcodes = Object.keys(OPCODES).map(k => parseInt(k));

function testNextOpcode() {
  if (testIndex >= opcodes.length) {
    console.log('\nAlle Tests fertig!');
    return;
  }

  const opcode = opcodes[testIndex];
  const hex = buildHex(opcode);
  
  console.log(`[${testIndex + 1}/${opcodes.length}] Opcode 0x${opcode.toString(16).padStart(2, '0')} (${OPCODES[opcode]})`);
  console.log(`  HEX: ${hex}`);

  const client = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    
    // Analysiere die Antwort
    if (rxHex.startsWith('02044000')) {
      const status = rxHex.substring(8, 10);
      console.log(`  → Fehler 0x${status}`);
    } else if (rxHex.startsWith('02')) {
      console.log(`  → Möglicherweise Erfolg!`);
    }
    console.log();
    
    client.end();
  });

  client.on('error', (err) => {
    console.log(`  Fehler: ${err.message}\n`);
  });

  client.on('close', () => {
    testIndex++;
    setTimeout(() => testNextOpcode(), 500);
  });
}

testNextOpcode();
