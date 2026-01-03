// tcp-hex-operand-structure.js
// Testet verschiedene Operanden-Strukturen (unterschiedliche Byte-Reihenfolgen)

import net from 'node:net';

const opcode = 0x48;
const status = 0x02; // RUNTER
const addrLow = 0x00;
const addrHigh = 0x06;

// Verschiedene Operanden-Strukturen zum Testen
const structures = [
  {
    name: 'Current (OpCode, Status, AddrLow, AddrHigh)',
    operand: [opcode, status, addrLow, addrHigh]
  },
  {
    name: 'Status NACH Adressen (OpCode, AddrLow, AddrHigh, Status)',
    operand: [opcode, addrLow, addrHigh, status]
  },
  {
    name: 'Adresse als High,Low (OpCode, Status, AddrHigh, AddrLow)',
    operand: [opcode, status, addrHigh, addrLow]
  },
  {
    name: 'Nur OpCode + Adressen (OpCode, AddrLow, AddrHigh)',
    operand: [opcode, addrLow, addrHigh]
  },
  {
    name: 'OpCode + Status + AddrHigh + AddrLow (alt)',
    operand: [opcode, status, addrHigh, addrLow]
  },
  {
    name: 'Status am Anfang (Status, OpCode, AddrLow, AddrHigh)',
    operand: [status, opcode, addrLow, addrHigh]
  }
];

function buildFrame(operand) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const station = 0x00, opCount = 0x01;
  
  const payload = [TYP, station, opCount, ...operand];
  const len = payload.length + 1;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  const frame = [...frameNoCksum, ckLow, ckHigh];
  return Buffer.from(frame).toString('hex');
}

console.log('Teste verschiedene Operanden-Strukturen:\n');

let testIndex = 0;

function testNext() {
  if (testIndex >= structures.length) {
    console.log('\nAlle Tests fertig!');
    return;
  }

  const struct = structures[testIndex];
  const hex = buildFrame(struct.operand);
  
  console.log(`[${testIndex + 1}/${structures.length}] ${struct.name}`);
  console.log(`  Operand-Bytes: ${struct.operand.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
  console.log(`  HEX: ${hex}`);

  const client = net.createConnection({ host: '192.168.178.234', port: 1001 }, () => {
    client.write(Buffer.from(hex, 'hex'));
  });

  client.on('data', (data) => {
    const rxHex = data.toString('hex');
    console.log(`  RX: ${rxHex}`);
    
    if (rxHex.startsWith('020440001502') || rxHex.startsWith('020440001501')) {
      const code = rxHex.substring(8, 10);
      console.log(`  → Fehler 0x${code}`);
    } else if (rxHex.startsWith('020440')) {
      console.log(`  → Andere Antwort`);
    } else if (rxHex.startsWith('02')) {
      console.log(`  → ✓ MÖGLICHERWEISE ERFOLG!`);
    }
    console.log();
    
    client.end();
  });

  client.on('error', (err) => {
    console.log(`  Fehler: ${err.message}\n`);
  });

  client.on('close', () => {
    testIndex++;
    setTimeout(() => testNext(), 500);
  });
}

testNext();
