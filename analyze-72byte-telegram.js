// Analyse des 72-Byte Telegramms (Zeitautomatik Status-Query)
const hex = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
const bytes = Buffer.from(hex, 'hex');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('72-BYTE TELEGRAMM ANALYSE (Zeitautomatik Status)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nHEADER:');
console.log('  STX:      0x' + bytes[0].toString(16).padStart(2,'0'));
console.log('  LEN:      0x' + bytes[1].toString(16).padStart(2,'0'), '=', bytes[1], 'bytes Payload');
console.log('  TYP:      0x' + bytes[2].toString(16).padStart(2,'0'));
console.log('  BEF:      0x' + bytes[3].toString(16).padStart(2,'0'), '0x' + bytes[4].toString(16).padStart(2,'0'));
console.log('  OPCOUNT:  0x' + bytes[5].toString(16).padStart(2,'0'), '=', bytes[5], 'Operanden');

console.log('\n\nOPERANDEN (je 3 Bytes):');
console.log('─────────────────────────────────────────────────────');
for (let i = 0; i < bytes[5]; i++) {
  const opStart = 6 + i * 3;
  const opCode = bytes[opStart];
  const addrLow = bytes[opStart + 1];
  const addrHigh = bytes[opStart + 2];
  
  let desc = '';
  if (opCode === 0x48) desc = 'Byte Read';
  else if (opCode === 0x69) desc = 'Word Read';
  
  console.log(`Operand ${(i+1).toString().padStart(2)}: OpCode=0x${opCode.toString(16).padStart(2,'0')} (${desc}) Addr=0x${addrLow.toString(16).padStart(2,'0')}${addrHigh.toString(16).padStart(2,'0')}`);
}

console.log('\n\nFOOTER:');
const etxPos = bytes.length - 3;
console.log('  ETX:      0x' + bytes[etxPos].toString(16).padStart(2,'0'));
console.log('  CHECKSUM: 0x' + bytes[etxPos+1].toString(16).padStart(2,'0') + bytes[etxPos+2].toString(16).padStart(2,'0'));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('INTERPRETATION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Dieses Telegramm liest für Motor 1 (SPS1):');
console.log('  - 15x OpCode 0x48 (Byte Read) - Motor-Status-Werte');
console.log('  -  6x OpCode 0x69 (Word Read) - Zeitschaltpunkte 1-6');
console.log('\nVerwendet bei: App-Start, Zeitautomatik-Dialog öffnen');
// [EXPERIMENTELL/ANALYSE] Protokollanalyse
