/**
 * EXTRACTED INFORMATION FROM: Befehle-iHomeControl-K2-0.pdf
 * Analysis of iHomeControl K2 Motor Control Command Structures
 */

// ============================================================================
// 1. COMMAND FRAME STRUCTURE FOR MOTOR CONTROL (UP/DOWN/STOP)
// ============================================================================

/**
 * Basic Motor Control Frame Structure (Single Motor)
 * 
 * Position | Name            | Description
 * ---------|-----------------|--------------------------------------------------
 *    1     | STX             | Start of frame (0x02)
 *    2     | Nutz-bytes      | Number of data bytes (0x08 for single motor commands)
 *    3     | Stat. A/B       | Status A/B (0x41)
 *    4     | Bef. low        | Command address low byte (0x00)
 *    5     | Bef. high       | Command address high byte (0x00)
 *    6     | Anz.            | Operand count / Number of motors (0x01)
 *    7     | Oper. Code      | Operation code (0x48 = Byte Write)
 *    8     | Adr. low        | Motor address low byte
 *    9     | Adr. high       | Motor address high byte
 *   10     | Oper. Stat.     | Operation Status / Command Code (see values below)
 *   11     | ETX             | End of frame (0x03)
 *   12     | Prüf. Sum. low  | Checksum low byte
 *   13     | Prüf. Sum. high | Checksum high byte
 */

// ============================================================================
// 2. MOTOR ADDRESS ENCODING FORMAT
// ============================================================================

/**
 * Motor addresses use LOW/HIGH byte format (16-bit operand addresses)
 * 
 * Motor 1:  Adr-low: 0x00, Adr-high: 0x00
 * Motor 2:  Adr-low: 0x01, Adr-high: 0x00  (Actually 0x01 in examples shows 0x48 0x11)
 * Motor 3:  Adr-low: 0x02, Adr-high: 0x00
 * etc.
 * 
 * Note: Addresses appear to be encoded as single byte offsets in practical examples
 * Motor 1:  0x48 0x01 0x00 (0x48=operation code, 0x01=motor address, 0x00=high byte)
 * Motor 2:  0x48 0x02 0x00 (for UP command in group control)
 * Motor 2:  0x48 0x11 0x00 (alternative encoding - 0x11 = decimal 17)
 * Motor 3:  0x48 0x13 0x00
 * Motor 4:  0x48 0x14 0x00
 * etc.
 * 
 * Pattern for position-based access (reading motor positions):
 * Motor 1: 0x48 0x03 0x00
 * Motor 2: 0x48 0x04 0x00
 * Motor 3: 0x48 0x13 0x00
 * Motor 4: 0x48 0x14 0x00
 * Motor 5: 0x48 0x23 0x00
 * Motor 6: 0x48 0x24 0x00
 */

// ============================================================================
// 3. STATUS/COMMAND CODES FOR MOTOR DIRECTION CONTROL
// ============================================================================

const MOTOR_COMMANDS = {
  UP:    0x01,    // Fahre hoch (Drive UP)
  DOWN:  0x02,    // Fahre runter (Drive DOWN)
  STOP:  0x03,    // Stop
  SHADE: 0x02,    // Beschattungsfahrt (Shading drive) - same as DOWN (DOWN then STOP after pause)
};

/**
 * COMMAND CODE VALUES (Oper. Stat. position):
 * 0x01 = UP/HIGH (Fahre hoch)
 * 0x02 = DOWN/LOW (Fahre runter)
 * 0x03 = STOP (Halt)
 * 
 * For "Beschattungsfahrt" (shading operation):
 *   - Send DOWN command (0x02)
 *   - Wait ~0.1 seconds
 *   - Send STOP command (0x03)
 * 
 * Additional Commands (0x69 = Read Operation):
 * 0x69 0x0F 0x00 = Shading command sequence
 * 0x69 0x06 0x00 = Read automation state
 * 0x69 0x01 0x00 = Read motor runtime
 */

// ============================================================================
// 4. OPERATION CODES
// ============================================================================

const OPERATION_CODES = {
  WRITE_BYTE: 0x48,  // Byte write operation for motor control
  READ_OP:    0x69,  // Read operation code
};

// ============================================================================
// 5. COMPLETE COMMAND FRAME EXAMPLES FOR MOTOR OPERATIONS
// ============================================================================

/**
 * EXAMPLE 1: Single Motor UP Command
 * Command: "Fahre hoch" (Drive UP) for Motor 1
 */
const EXAMPLE_UP = {
  hex:  "02 08 41 00 01 01 48 01 00 01 03 8D 00",
  dec:  [2, 8, 65, 0, 1, 1, 72, 1, 0, 1, 3, 141, 0],
  structure: {
    STX:           0x02,       // Start
    nutzBytes:     0x08,       // 8 data bytes
    statAB:        0x41,       // Status
    befLow:        0x00,       // Command address low
    befHigh:       0x00,       // Command address high
    anzahl:        0x01,       // 1 operand (1 motor)
    operCode:      0x48,       // Byte write
    adrLow:        0x01,       // Motor 1 address low
    adrHigh:       0x00,       // Motor 1 address high
    operStat:      0x01,       // COMMAND: UP (0x01)
    ETX:           0x03,       // End
    checksumLow:   0x8D,       // Checksum
    checksumHigh:  0x00        // Checksum high byte
  }
};

/**
 * EXAMPLE 2: Single Motor DOWN Command
 * Command: "Fahre runter" (Drive DOWN) for Motor 1
 */
const EXAMPLE_DOWN = {
  hex:  "02 08 41 00 01 01 48 02 00 01 03 8E 00",
  dec:  [2, 8, 65, 0, 1, 1, 72, 2, 0, 1, 3, 142, 0],
  structure: {
    operStat: 0x02  // COMMAND: DOWN (0x02)
  }
};

/**
 * EXAMPLE 3: Shading Operation (Beschattungsfahrt)
 * Command: Drive DOWN then STOP after 0.1 second pause
 * Step 1: Send DOWN command
 */
const EXAMPLE_SHADE_DOWN = {
  hex:  "02 08 41 00 01 01 48 02 00 01 03 8E 00",
  dec:  [2, 8, 65, 0, 1, 1, 72, 2, 0, 1, 3, 142, 0],
};

/**
 * Step 2: Wait ~0.1 seconds, then send special shading sequence
 */
const EXAMPLE_SHADE_SEQUENCE = {
  hex:  "02 09 41 00 01 01 69 0F 00 00 00 03 BB 00 BB",
  dec:  [2, 9, 65, 0, 1, 1, 105, 15, 0, 0, 0, 3, 187, 0, 187],
  structure: {
    operCode: 0x69,     // Read/special operation
    shadeCode: 0x0F,    // Shading sequence code
  }
};

/**
 * EXAMPLE 4: STOP Command (Single Motor)
 * Command: "Stop" (Halt) for Motor 1
 * Note: STOP uses a different frame structure with value bytes
 */
const EXAMPLE_STOP = {
  description: "Stop command uses different structure with Wert-Wert bytes",
  frameStructure: {
    position1: "STX",
    position2: "Nutz-Daten-bytes (0x09 for stop commands)",
    position3: "Stat. A/B (0x41)",
    position4: "Bef. low (0x00)",
    position5: "Bef. high (0x00)",
    position6: "Anz. (0x01)",
    position7: "Oper. Code (0x48 or 0x69)",
    position8: "Adr. low",
    position9: "Adr. high",
    position10: "Wert-low (value low byte)",
    position11: "Wert-high (value high byte)",
    position12: "ETX",
    position13: "Prüf.Sum. low",
    position14: "Prüf.Sum. high"
  }
};

/**
 * EXAMPLE 5: Group Control - Two Motors UP
 * Command: Drive UP for Motor 1 AND Motor 2
 */
const EXAMPLE_GROUP_UP = {
  hex:  "02 0C 41 00 01 02 48 01 00 01 48 11 00 01 03 E8 00",
  dec:  [2, 12, 65, 0, 1, 2, 72, 1, 0, 1, 72, 17, 0, 1, 3, 232, 0],
  structure: {
    STX:           0x02,       // Start
    nutzBytes:     0x0C,       // 12 data bytes
    statAB:        0x41,
    befLow:        0x00,
    befHigh:       0x00,
    anzahl:        0x02,       // 2 operands (2 motors)
    oper1Code:     0x48,       // Motor 1 - Byte write
    oper1AdrLow:   0x01,       // Motor 1 address
    oper1AdrHigh:  0x00,
    oper1Stat:     0x01,       // Motor 1: UP
    oper2Code:     0x48,       // Motor 2 - Byte write
    oper2AdrLow:   0x11,       // Motor 2 address (0x11 = decimal 17)
    oper2AdrHigh:  0x00,
    oper2Stat:     0x01,       // Motor 2: UP
    ETX:           0x03,
    checksumLow:   0xE8,
    checksumHigh:  0x00
  }
};

/**
 * EXAMPLE 6: Group Control - Two Motors DOWN
 */
const EXAMPLE_GROUP_DOWN = {
  hex:  "02 0C 41 00 01 02 48 02 00 01 48 12 00 01 03 EA 00",
  dec:  [2, 12, 65, 0, 1, 2, 72, 2, 0, 1, 72, 18, 0, 1, 3, 234, 0],
  note: "Motor 1: 0x48 0x02 0x01 (DOWN), Motor 2: 0x48 0x12 0x01 (DOWN)"
};

/**
 * EXAMPLE 7: Complex STOP with Multiple Operations
 * Reading/stopping multiple motors at once
 */
const EXAMPLE_COMPLEX_STOP = {
  hex:  "02 16 41 00 01 04 69 0d 00 30 75 69 0e 00 30 75 48 03 00 00 48 04 00 00 03 14 03",
  frameStructure: {
    purpose: "Complex operation with read operations (0x69) and write operations (0x48)",
    operCount: 4,  // 4 operands
    operations: [
      { code: 0x69, addr: 0x0d00, value: 0x7530 },  // Read operation
      { code: 0x69, addr: 0x0e00, value: 0x7530 },  // Read operation
      { code: 0x48, addr: 0x03, command: 0x00 },    // Stop operation
      { code: 0x48, addr: 0x04, command: 0x00 }     // Stop operation
    ]
  }
};

/**
 * EXAMPLE 8: Read All Motor Positions
 */
const EXAMPLE_READ_ALL_POSITIONS = {
  hex:  "02 28 41 00 00 0C 48 03 00 48 04 00 48 13 00 48 14 00 48 23 00 48 24 00",
  frameStructure: {
    purpose: "Read status of 6 motors",
    operCount: 12,
    note: "12 operands = 6 motors (each motor requires 2 address bytes)"
  }
};

// ============================================================================
// 6. CHECKSUM CALCULATION
// ============================================================================

/**
 * Checksum is calculated as:
 * Sum of all byte values from "Typ A/B" (position 3) to one byte before ETX
 * Example for UP command:
 *   65 + 0 + 1 + 1 + 72 + 1 + 0 + 1 = 141 (0x8D)
 * 
 * The checksum appears to be stored as low byte and high byte
 * For 141: Low = 0x8D, High = 0x00
 */

// ============================================================================
// 7. VERIFICATION POINTS FOR JAVASCRIPT CODE
// ============================================================================

/**
 * YOUR CODE SHOULD VERIFY:
 * 
 * 1. OPERATION CODE (0x48 vs 0x69):
 *    - Use 0x48 for motor control commands (UP/DOWN/STOP)
 *    - Use 0x69 for read operations
 * 
 * 2. MOTOR ADDRESS ENCODING:
 *    - Motor 1: low=0x01 or 0x03 (depends on context)
 *    - Motor 2: low=0x02 or 0x04 or 0x11
 *    - Addresses are TWO bytes: low byte + high byte (usually 0x00)
 *    - Some motors use sequential addressing (0x01, 0x02, 0x03...)
 *    - Some use paired addressing for positions (0x03, 0x04 for Motor 1 pos)
 * 
 * 3. COMMAND VALUES:
 *    - 0x01 = UP (Fahre hoch)
 *    - 0x02 = DOWN (Fahre runter)
 *    - 0x03 = STOP (Halt)
 * 
 * 4. FRAME STRUCTURE:
 *    - STX = 0x02 (required)
 *    - ETX = 0x03 (required)
 *    - Position 6 = Operand count (number of motors or operations)
 *    - Checksum calculation = SUM(bytes 3 to 11) as 16-bit value
 * 
 * 5. SPECIAL CASES:
 *    - Shading operation requires: DOWN → 0.1s pause → Special sequence (0x69 0x0F)
 *    - Group operations use multiple operand pairs
 *    - Read operations use 0x69 code with different address patterns
 */

// ============================================================================
// REFERENCE TABLE: MOTOR ADDRESS PATTERNS
// ============================================================================

/**
 * From the PDF examples, here's the address mapping:
 * 
 * SINGLE MOTOR CONTROL ADDRESSES:
 *   Motor 1: 0x01
 *   Motor 2: 0x02
 *   Motor 3: 0x03 (possibly 0x03 in some contexts, 0x13 in others)
 * 
 * POSITION READ ADDRESSES (0x48 operation):
 *   Motor 1 position: 0x03
 *   Motor 2 position: 0x04
 *   Motor 3 position: 0x13
 *   Motor 4 position: 0x14
 *   Motor 5 position: 0x23
 *   Motor 6 position: 0x24
 * 
 * GROUP CONTROL ADDRESSES:
 *   Motor 1: 0x01
 *   Motor 2: 0x11 (group variant)
 * 
 * AUTOMATION READ ADDRESSES (0x69 operation):
 *   Motor 1 automation: 0x06
 *   Motor 1 runtime: 0x01
 *   Motor 2 runtime: 0x02
 *   Motor 5 runtime: 0x05
 *   Motor 3 runtime: 0x03
 */

module.exports = {
  MOTOR_COMMANDS,
  OPERATION_CODES,
  EXAMPLE_UP,
  EXAMPLE_DOWN,
  EXAMPLE_GROUP_UP,
  EXAMPLE_STOP
};
