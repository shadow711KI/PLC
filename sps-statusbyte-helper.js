// Hilfsfunktionen zur Statusbyte-Berechnung für SPS Zeitautomatik
// Quelle: Zuordnungstabelle (siehe Screenshot)

/**
 * Gibt das Statusbyte für einen Motor und eine Funktion zurück (Opcode 48, Byte-weise)
 * @param {number} motorNr - Motor-Nummer (1-6)
 * @param {string} befehl - Einer der Strings: 'hoch', 'runter', 'oben', 'unten', 'stop', 'position', 'beschattung'
 * @returns {string} Statusbyte als Hex-String (z.B. '12')
 */
function getStatusByte48(motorNr, befehl) {
  // Only protocol-relevant fields for OpCode 48 (Byte): hoch, runter, position_oben, position_unten
  // motorNr: 1-6
  // befehl: 'hoch', 'runter', 'position_oben', 'position_unten'
  const base = (motorNr - 1) * 0x10;
  const map = {
    'hoch': 0x01,              // Fahre hoch
    'runter': 0x02,            // Fahre runter
    'position_oben': 0x03,     // Position oben (laut Tabelle: base+0x03)
    'position_unten': 0x04     // Position unten (laut Tabelle: base+0x04)
  };
  if (!(befehl in map)) throw new Error('Unbekannter Befehl: ' + befehl);
  return (base + map[befehl]).toString(16).padStart(2, '0');
}

/**
 * Gibt das Statuswort für einen Motor und eine Funktion zurück (Opcode 69, Wort-weise)
 * @param {number} motorNr - Motor-Nummer (1-6)
 * @param {string} befehl - Einer der Strings: 'laufzeit_hoch', 'laufzeit_runter', 'antipzeit_hoch', ...
 * @returns {string} Statuswort als Hex-String (z.B. '11')
 */
function getStatusWord69(motorNr, befehl) {
  // Only protocol-relevant fields from the table (top half, OpCode 69)
  // motorNr: 1-6
  // befehl: 'laufzeit_hoch', 'laufzeit_runter', 'antipzeit_hoch', 'antipzeit_runter', 'wendzeit',
  //         'autom_ein_aus', 'zeitschaltpunkt1' ... 'zeitschaltpunkt6', 'motor_stop', 'motor_stop2', 'beschattung'
  const base = (motorNr - 1) * 0x10;
  const map = {
    'laufzeit_hoch': 0x01,
    'laufzeit_runter': 0x02,
    'antipzeit_hoch': 0x03,
    'antipzeit_runter': 0x04,
    'wendzeit': 0x05,
    'autom_ein_aus': 0x06,
    'zeitschaltpunkt1': 0x07,
    'zeitschaltpunkt2': 0x08,
    'zeitschaltpunkt3': 0x09,
    'zeitschaltpunkt4': 0x0A,
    'zeitschaltpunkt5': 0x0B,
    'zeitschaltpunkt6': 0x0C,
    'motor_stop': 0x0D,
    'motor_stop2': 0x0E,
    'beschattung': 0x0F
  };
  if (!(befehl in map)) throw new Error('Unbekannter Befehl: ' + befehl);
  return (base + map[befehl]).toString(16).padStart(2, '0');
}

// Beispiel-Nutzung:
// getStatusByte48(2, 'hoch') // → '11'
// getStatusByte48(6, 'runter') // → '52'
// getStatusWord69(1, 'laufzeit_hoch') // → '01'
// getStatusWord69(3, 'zeitschaltpunkt4') // → '2a'

module.exports = { getStatusByte48, getStatusWord69 };