// tcp-hex-checksum-debug.js
// Debuggt die Checksummenberechnung

function buildAndDebug(opcode, status, addrLow, addrHigh) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const station = 0x00, opCount = 0x01;
  
  // Frame ohne Checksumme: STX | Länge | Typ | Station | OpCount | OpCode | Status | AddrLow | AddrHigh | ETX
  const payload = [TYP, station, opCount, opcode, status, addrLow, addrHigh];
  const len = payload.length + 1; // +1 für ETX
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  // Checksumme: Summe von Typ bis High-Byte (inklusiv), exklusiv STX, Länge und ETX
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  const frame = [...frameNoCksum, ckLow, ckHigh];
  
  console.log(`Opcode 0x${opcode.toString(16).padStart(2, '0')}, Status 0x${status.toString(16).padStart(2, '0')}:`);
  console.log(`  Frame-Bytes: ${frame.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`);
  console.log(`  HEX-String: ${Buffer.from(frame).toString('hex')}`);
  console.log(`  Checksumme-Berechnung:`);
  console.log(`    Bytes summiert: ${payload.map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' + ')} = 0x${sum.toString(16).toUpperCase()}`);
  console.log(`    Checksum (Low, High): 0x${ckLow.toString(16).padStart(2, '0').toUpperCase()}, 0x${ckHigh.toString(16).padStart(2, '0').toUpperCase()}`);
  console.log();
  
  return Buffer.from(frame).toString('hex');
}

console.log('Checksumme-Debug für verschiedene Befehle:\n');

// Motor "Arbeiten": addrLow=0x00, addrHigh=0x06
buildAndDebug(0x48, 0x02, 0x00, 0x06); // BYTE, RUNTER
buildAndDebug(0x48, 0x01, 0x00, 0x06); // BYTE, HOCH
buildAndDebug(0x48, 0x03, 0x00, 0x06); // BYTE, STOP
buildAndDebug(0x69, 0x01, 0x56, 0x00); // AUTO, Freigabe (alte Adresse aus ursprünglichem Befehl)
