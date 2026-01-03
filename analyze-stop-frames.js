#!/usr/bin/env node

// Analyse der STOP-Frames
const stopFrames = [
  { motor: "Arbeiten", frame: "021641000104695D003075695E0030754853000048540000035404" },
  { motor: "Wohnen_Sued_links", frame: "021641000104690D003075690E0030754803000048040000031403" },
  { motor: "Wohnen_Sued_rechts", frame: "021641000104691D003075691E0030754813000048140000035403" },
  { motor: "Wohnen_West_links", frame: "021641000104692D003075692E0030754823000048240000039403" },
  { motor: "Wohnen_West_rechts", frame: "021641000104693D003075693E003075483300004834000003D403" },
  { motor: "Wohnen_Ost", frame: "021641000104694D003075694E0030754843000048440000031404" }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║       ANALYSE STOP-FRAMES (Komplexes Format)           ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

stopFrames.forEach(({ motor, frame }, idx) => {
  console.log(`Motor ${idx + 1}: ${motor}`);
  console.log(`  HEX: ${frame}`);
  console.log(`  Länge: ${frame.length / 2} bytes`);
  
  // Byte-für-Byte Analyse
  const bytes = [];
  for (let i = 0; i < frame.length; i += 2) {
    bytes.push(frame.substring(i, i + 2));
  }
  
  console.log(`  Bytes: ${bytes.join(' ')}`);
  console.log(`  STX: 0x${bytes[0]}`);
  console.log(`  LEN: 0x${bytes[1]}`);
  console.log(`  TYP: 0x${bytes[2]}`);
  console.log(`  OpCode: 0x${bytes[3]}`);
  console.log(`  Byte4-5: 0x${bytes[4]}0x${bytes[5]}`);
  console.log(`  Befehl: 0x${bytes[6]}`);
  console.log('');
});

// Vergleich
console.log('═══════════════════════════════════════════════════════\n');
console.log('UNTERSCHIEDE ZWISCHEN DEN FRAMES:\n');

stopFrames.forEach(({ motor, frame }) => {
  const bytes = [];
  for (let i = 0; i < frame.length; i += 2) {
    bytes.push(frame.substring(i, i + 2));
  }
  
  // Suche Variable Bytes
  console.log(`${motor}:`);
  console.log(`  Bytes[4-5]: 0x${bytes[4]}${bytes[5]}`);
  console.log(`  Bytes[6]: 0x${bytes[6]}`);
  console.log(`  Bytes[8-9]: 0x${bytes[8]}${bytes[9]}`);
  console.log(`  Bytes[10-11]: 0x${bytes[10]}${bytes[11]}`);
  console.log('');
});
