// SPS Statusbyte-Tabelle als ASCII-Tabelle (ähnlich wie im Bild)
// Nutzt sps-statusbyte-helper.js für die Berechnung

const { getStatusByte48, getStatusWord69 } = require('./sps-statusbyte-helper');

const motors = [1, 2, 3, 4, 5, 6];
const befehle48 = [
  'hoch',           // Fahre hoch
  'runter',         // Fahre runter
  'position_oben',  // Position oben
  'position_unten'  // Position unten
];

const befehle69 = [
  'laufzeit_hoch',
  'laufzeit_runter',
  'antipzeit_hoch',
  'antipzeit_runter',
  'wendzeit',
  'autom_ein_aus',
  'zeitschaltpunkt1',
  'zeitschaltpunkt2',
  'zeitschaltpunkt3',
  'zeitschaltpunkt4',
  'zeitschaltpunkt5',
  'zeitschaltpunkt6',
  'motor_stop',
  'motor_stop2',
  'beschattung'
];

function printTable48() {
  console.log('Statusbytes für Opcode 48 (Byte-weise, Motor 1-6):');
  let header = '| Befehl/Motor |';
  for (const m of motors) header += ` M${m} |`;
  console.log(header);
  console.log('|--------------|' + '------|'.repeat(motors.length));
  for (const b of befehle48) {
    let row = `| ${b.padEnd(12)}|`;
    for (const m of motors) {
      try {
        row += `  ${getStatusByte48(m, b).toUpperCase().padEnd(3)}|`;
      } catch {
        row += '  -- |';
      }
    }
    console.log(row);
  }
  console.log();
}

function printTable69() {
  console.log('Statuswörter für Opcode 69 (Wort-weise, Motor 1-6):');
  let header = '| Befehl/Motor      |';
  for (const m of motors) header += ` M${m}  |`;
  console.log(header);
  console.log('|-------------------|' + '------|'.repeat(motors.length));
  for (const b of befehle69) {
    let row = `| ${b.padEnd(17)}|`;
    for (const m of motors) {
      try {
        row += `  ${getStatusWord69(m, b).toUpperCase().padEnd(3)}|`;
      } catch {
        row += '  -- |';
      }
    }
    console.log(row);
  }
  console.log();
}

printTable48();
printTable69();
