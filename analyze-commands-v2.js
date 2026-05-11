#!/usr/bin/env node

const fs = require('fs');

const commands = JSON.parse(fs.readFileSync('./app-commands.json', 'utf-8'));

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║       KORREKTE ANALYSE DER CAPTURED BEFEHLE            ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const motorNames = [
  'Wohnen_Ost',
  'Wohnen_Sued_links',
  'Wohnen_Sued_rechts',
  'Wohnen_West_links',
  'Wohnen_West_rechts',
  'Arbeiten'
];

let einfachCount = 0;
let komplexCount = 0;

commands.forEach((cmd) => {
  const hex = cmd.hex;
  const len = hex.length / 2;
  
  console.log(`Cmd #${cmd.command} (${cmd.timestamp}):`);
  console.log(`  HEX: ${hex}`);
  console.log(`  Länge: ${len} bytes`);
  
  if (len === 13) {
    einfachCount++;
    console.log(`  Format: EINFACH (13 bytes)`);
    
    // Byte-Positionen für 13-byte Format:
    // 0: STX(02)
    // 1: LEN(08)
    // 2-3: TYP(41)
    // 4-5: STATION(00)
    // 6-7: OPCOUNT(01)
    // 8-9: OPCODE(01)
    // 10-11: VALUE_LOW(48)
    // 12-13: MOTOR_BYTE
    // 14-15: STATUS
    // 16-17: ADDR_HIGH(00)
    // 18-19: ???(01)
    // 20-21: ETX(03)
    // 22-23: CKSUM
    
    const motorByteHex = hex.substring(12, 14);
    const statusHex = hex.substring(14, 16);
    const addrHighHex = hex.substring(16, 18);
    
    const motorByteVal = parseInt(motorByteHex, 16);
    
    // Zwei mögliche Formeln:
    // 1. Direkt: motorNr = motorByteVal - 0x01 (wenn 0x02→1, 0x03→2)
    // 2. Mit Shift: motorNr = (motorByteVal - 0x02) / 0x10 + 1
    
    let motorNr = 0;
    if (motorByteVal >= 0x02 && motorByteVal <= 0x52) {
      motorNr = Math.floor((motorByteVal - 0x02) / 0x10) + 1;
    } else if (motorByteVal >= 0x01 && motorByteVal <= 0x06) {
      motorNr = motorByteVal;
    }
    
    let action = '';
    switch (statusHex) {
      case '01': action = 'HOCH'; break;
      case '02': action = 'RUNTER'; break;
      case '03': action = 'STOP'; break;
      default: action = `UNKNOWN(0x${statusHex})`;
    }
    
    const motorName = motorNr > 0 && motorNr <= 6 ? motorNames[motorNr - 1] : '???';
    
    console.log(`  Motor-Byte: 0x${motorByteHex} → Motor ${motorNr} (${motorName})`);
    console.log(`  Status-Byte: 0x${statusHex} → ${action}`);
    console.log(`  Addr-High: 0x${addrHighHex}`);
    
  } else if (len === 27) {
    komplexCount++;
    console.log(`  Format: KOMPLEX (27 bytes - App Szenen-Format)`);
    
    const opcode = hex.substring(6, 8);
    const befehl = hex.substring(12, 14);
    
    console.log(`  OpCode: 0x${opcode}`);
    console.log(`  Befehl: 0x${befehl}`);
  }
  
  console.log('');
});

console.log('═══════════════════════════════════════════════════════\n');
console.log(`Einfache Befehle: ${einfachCount}`);
console.log(`Komplexe Befehle: ${komplexCount}`);
console.log(`Gesamt: ${commands.length}\n`);
// [EXPERIMENTELL/ANALYSE] Protokollanalyse
