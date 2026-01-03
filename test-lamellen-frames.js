#!/usr/bin/env node

// Test-Script für Lamellen-Frames

// Lamellen-Frame (Wendefunktion)
function buildLamellenFrame(motorNr) {
  const STX = 0x02;
  const LEN = 0x09;
  const TYP = 0x41;
  const STATION = 0x00;
  const OPCODE = 0x01;
  const COUNT = 0x01;
  
  // Operand: 0x695F ist konstant für alle Motoren
  const payload = [TYP, STATION, OPCODE, COUNT, 0x69, 0x5F, 0x00, 0x00, 0x00];
  const ETX = 0x03;
  
  const frameNoCksum = [STX, LEN, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Einfacher Frame (HOCH/RUNTER)
function buildFrame(motorNr, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const STATION = 0x00;
  const opCount = 0x01;
  const opcode = 0x01;
  const valueLow = 0x48;
  
  const statusByte = (motorNr - 1) * 0x10 + status;
  
  const payload = [TYP, STATION, opCount, opcode, valueLow, statusByte, 0x00, 0x01];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

console.log('\n=== TEST LAMELLEN FRAMES ===\n');

// Motor 6 (Arbeiten) - das ist der Motor in den Logs!
console.log('Motor 6 (Arbeiten) - DER RICHTIGE MOTOR:');
const motor6Lamellen = buildLamellenFrame(6);
console.log('  Lamellen schließen:', motor6Lamellen.toString('hex'));
console.log('  Erwartet (Log #64):', '020941000101695f000000030b01');
console.log('  Match:', motor6Lamellen.toString('hex') === '020941000101695f000000030b01' ? '✅' : '❌');

const motor6Runter = buildFrame(6, 0x02);
console.log('  Lamellen öffnen (RUNTER):', motor6Runter.toString('hex'));
console.log('  Erwartet (Log #63):', '0208410001014852000103de00');
console.log('  Match:', motor6Runter.toString('hex') === '0208410001014852000103de00' ? '✅' : '❌');

// Zum Vergleich: Motor 5
console.log('\nMotor 5 (Wohnen_West_rechts) - ZUM VERGLEICH:');
const motor5Lamellen = buildLamellenFrame(5);
console.log('  Lamellen schließen:', motor5Lamellen.toString('hex'));
console.log('  Erwartet (Session #16-17):', '0208410001014841/42');

const motor5Runter = buildFrame(5, 0x02);
console.log('  Lamellen öffnen (RUNTER):', motor5Runter.toString('hex'));

console.log('\n');
