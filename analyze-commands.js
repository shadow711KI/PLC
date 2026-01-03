#!/usr/bin/env node

const fs = require('fs');

const commands = JSON.parse(fs.readFileSync('./app-commands.json', 'utf-8'));

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║       ANALYSE DER CAPTURED APP-BEFEHLE                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let einfachCount = 0;
let komplexCount = 0;

commands.forEach((cmd) => {
  const hex = cmd.hex;
  const len = hex.length / 2;
  
  if (len === 13) {
    einfachCount++;
    
    const motorByte = hex.substring(12, 14);
    const status = hex.substring(14, 16);
    
    const motorByteVal = parseInt(motorByte, 16);
    const motorNr = Math.floor((motorByteVal - 0x02) / 0x10) + 1;
    
    let action = '';
    switch (status) {
      case '01': action = 'HOCH'; break;
      case '02': action = 'RUNTER'; break;
      case '03': action = 'STOP'; break;
      default: action = '???';
    }
    
    const motorName = [
      'Wohnen_Ost',
      'Wohnen_Sued_links',
      'Wohnen_Sued_rechts',
      'Wohnen_West_links',
      'Wohnen_West_rechts',
      'Arbeiten'
    ][motorNr - 1] || '???';
    
    console.log(`Cmd #${cmd.command}: Motor ${motorNr} (${motorName}) → ${action}`);
    console.log(`           Byte: 0x${motorByte}, Status: 0x${status}`);
  } else if (len === 27) {
    komplexCount++;
    console.log(`Cmd #${cmd.command}: APP-Format (27 bytes) - Szene/Gruppe`);
    console.log(`           ${hex.substring(0, 40)}...`);
  } else {
    console.log(`Cmd #${cmd.command}: Unbekanntes Format (${len} bytes)`);
  }
  
  console.log('');
});

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                    ZUSAMMENFASSUNG                     ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log(`✅ Einfaches Format: ${einfachCount} Befehle`);
console.log(`⚙️  Komplexes Format: ${komplexCount} Befehle`);
console.log(`📊 Gesamt: ${commands.length} Befehle\n`);
