#!/usr/bin/env node

// Komplexe STOP-Frames von der App mit Motor-Zuordnung
const stopFrames = [
  { motor: 1, name: 'Wohnen_Ost', hex: '021641000104694D003075694E0030754843000048440000031404' },
  { motor: 2, name: 'Wohnen_Sued_links', hex: '021641000104690D003075690E0030754803000048040000031403' },
  { motor: 3, name: 'Wohnen_Sued_rechts', hex: '021641000104691D003075691E0030754813000048140000035403' },
  { motor: 4, name: 'Wohnen_West_links', hex: '021641000104692D003075692E0030754823000048240000039403' },
  { motor: 5, name: 'Wohnen_West_rechts', hex: '021641000104693D003075693E003075483300004834000003D403' },
  { motor: 6, name: 'Arbeiten', hex: '021641000104695D003075695E0030754853000048540000035404' }
];

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║       ECHTE STOP-FRAMES - MUSTER ANALYSE               ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

stopFrames.forEach(({ motor, name, hex }) => {
  // Parse hex to bytes
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(hex.substring(i, i + 2));
  }
  
  console.log(`Motor ${motor} (${name}):`);
  console.log(`  HEX: ${hex}`);
  console.log(`  Bytes (hex):`);
  console.log(`    [0]    [1]    [2]    [3-5]       [6]    [7]    [8]    [9-11]    [12]   [13]`);
  console.log(`    ${bytes[0]}   ${bytes[1]}   ${bytes[2]}   ${bytes[3]}${bytes[4]}${bytes[5]}        ${bytes[6]}   ${bytes[7]}   ${bytes[8]}   ${bytes[9]}${bytes[10]}${bytes[11]}     ${bytes[12]}   ${bytes[13]}`);
  console.log(`    [14]   [15]   [16]   [17-19]    [20]   [21]   [22]   [23-25]   [26] [27]`);
  console.log(`    ${bytes[14]}   ${bytes[15]}   ${bytes[16]}   ${bytes[17]}${bytes[18]}${bytes[19]}     ${bytes[20]}   ${bytes[21]}   ${bytes[22]}   ${bytes[23]}${bytes[24]}${bytes[25]}    ${bytes[26]} ${bytes[27]}`);
  
  // Variable Bytes analysieren
  console.log(`  Variable Bytes:`);
  console.log(`    [7]: 0x${bytes[7]} = ${parseInt(bytes[7], 16)}`);
  console.log(`    [9]: 0x${bytes[9]}, [10]: 0x${bytes[10]}, [11]: 0x${bytes[11]}`);
  console.log(`    [13]: 0x${bytes[13]} = ${parseInt(bytes[13], 16)}`);
  console.log(`    [17]: 0x${bytes[17]}, [18]: 0x${bytes[18]}, [19]: 0x${bytes[19]}`);
  console.log(`    [21]: 0x${bytes[21]} = ${parseInt(bytes[21], 16)}`);
  console.log(`    [26]: 0x${bytes[26]} = ${parseInt(bytes[26], 16)}`);
  console.log('');
});

// Pattern-Erkennung
console.log('═══════════════════════════════════════════════════════\n');
console.log('PATTERN-ANALYSE:\n');

stopFrames.forEach(({ motor, name, hex }) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  
  const motorIdx = motor - 1;
  const byte7 = bytes[7];
  const byte13 = bytes[13];
  const byte21 = bytes[21];
  const byte26 = bytes[26];
  
  console.log(`Motor ${motor}:`);
  console.log(`  motorIdx=${motorIdx}, byte[7]=0x${byte7.toString(16).padStart(2,'0')}, byte[13]=0x${byte13.toString(16).padStart(2,'0')}, byte[21]=0x${byte21.toString(16).padStart(2,'0')}, byte[26]=0x${byte26.toString(16).padStart(2,'0')}`);
  
  // Formeln testen
  const f1 = motorIdx * 0x10 + 0x0D;
  const f2 = motorIdx * 0x10 + 0x0E;
  const f3 = motorIdx * 0x10 + 0x03;
  const f4 = motorIdx * 0x10 + 0x04;
  
  console.log(`  Formeln: (motorIdx*0x10+0x0D)=0x${f1.toString(16).padStart(2,'0')}, (motorIdx*0x10+0x0E)=0x${f2.toString(16).padStart(2,'0')}`);
  console.log(`  Formeln: (motorIdx*0x10+0x03)=0x${f3.toString(16).padStart(2,'0')}, (motorIdx*0x10+0x04)=0x${f4.toString(16).padStart(2,'0')}`);
  console.log('');
});
