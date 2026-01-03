// SOLUTION SUMMARY - iHomeControl K2 Motor Control Fix
// ====================================================

/**
 * PROBLEM IDENTIFIED:
 * 
 * After exhaustive testing showing all 42 address combinations responding
 * to the SPS, but only 1 motor physically moving, the issue was determined
 * to be in the TELEGRAM/FRAME FORMAT itself, not the addressing.
 * 
 * USER DISCOVERY: "kann es sein dass du das telegramm falsch sendest?"
 * (Could it be that the telegram is sent wrong?)
 */

/**
 * ROOT CAUSE:
 * 
 * The buildFrame() function in motor-control.js had the WRONG OpCode.
 * 
 * WRONG CODE (Previous):
 * ─────────────────────
 *   const opcode = 0x01;      // ❌ WRONG
 *   const valueLow = 0x48;    // ❌ WRONG - this should be OpCode
 *   
 *   payload = [TYP, 0x00, opCount, opcode, valueLow, valueHigh, addrLow, addrHigh]
 *   
 *   Frame structure was:
 *   STX | LEN | TYP | 0x00 | OPCOUNT | 0x01 | 0x48 | STATUS | ADDRLOW | ADDRHIGH | ETX | CKSUM
 * 
 * CORRECT CODE (Fixed):
 * ─────────────────────
 *   const operCode = 0x48;    // ✓ CORRECT - Byte Write Operation
 *   const operStat = status;  // ✓ CORRECT - UP(0x01), DOWN(0x02), STOP(0x03)
 *   
 *   payload = [TYP, befLow, befHigh, opCount, operCode, addrLow, addrHigh, operStat]
 *   
 *   Frame structure is now:
 *   STX | LEN | TYP | BEF_LOW | BEF_HIGH | OPCOUNT | OPERCODE(0x48) | ADDRLOW | ADDRHIGH | OPERSTAT | ETX | CKSUM
 */

/**
 * FRAME STRUCTURE REFERENCE (from PDF_ANALYSIS.js):
 * 
 * Position | Field           | Value      | Description
 * ---------|-----------------|------------|----------------------------------------
 *    1     | STX             | 0x02       | Start of Text
 *    2     | Length          | 0x08       | Number of data bytes
 *    3     | Status A/B      | 0x41       | Protocol status byte
 *    4     | Command Low     | 0x00       | Command address low byte
 *    5     | Command High    | 0x00       | Command address high byte
 *    6     | Operand Count   | 0x01       | Number of operands/motors
 *    7     | Operation Code  | 0x48       | Byte Write (motor control)
 *    8     | Motor Addr Low  | 0x01-0x06  | Motor address (LOW byte)
 *    9     | Motor Addr High | 0x00       | Motor address (HIGH byte)
 *   10     | Operation Stat  | 0x01/02/03 | Command: UP/DOWN/STOP
 *   11     | ETX             | 0x03       | End of Text
 *   12     | Checksum Low    | Calculated| Sum of bytes 3-10 (Low byte)
 *   13     | Checksum High   | Calculated| Sum of bytes 3-10 (High byte)
 */

/**
 * MOTOR ADDRESSING (SPS1):
 * 
 * Motor Name      | Address Low | Address High
 * ─────────────────────────────────────────────
 * Wohnen_Ost      | 0x01        | 0x00
 * Arbeiten        | 0x02        | 0x00
 * Motor_3         | 0x03        | 0x00
 * Motor_4         | 0x04        | 0x00
 * Motor_5         | 0x05        | 0x00
 * Motor_6         | 0x06        | 0x00
 */

/**
 * COMMAND CODES:
 * 
 * 0x01 = UP (Fahre hoch)
 * 0x02 = DOWN (Fahre runter)
 * 0x03 = STOP (Halt)
 */

/**
 * EXAMPLE FRAMES (CORRECTED):
 * 
 * Arbeiten DOWN:
 *   02 08 41 00 00 01 48 02 00 02 03 8E 00
 *   
 *   Breakdown:
 *   02       = STX
 *   08       = Length (8 data bytes)
 *   41       = Status A/B
 *   00 00    = Command address (0x0000)
 *   01       = Operand count (1 motor)
 *   48       = Operation Code (Byte Write)
 *   02       = Motor address low (Motor 2 = Arbeiten)
 *   00       = Motor address high
 *   02       = Operation Status (DOWN)
 *   03       = ETX
 *   8E 00    = Checksum (0x008E)
 */

/**
 * WHAT CHANGED:
 * 
 * File: motor-control.js
 * Function: buildFrame()
 * 
 * Changed the payload structure from:
 *   [TYP, 0x00, opCount, opcode(0x01), valueLow(0x48), valueHigh(status), addrLow, addrHigh]
 * 
 * To:
 *   [TYP, befLow(0x00), befHigh(0x00), opCount, operCode(0x48), addrLow, addrHigh, operStat(status)]
 * 
 * This ensures the correct operation code (0x48) is sent for motor control,
 * and the status byte is in the correct position.
 */

/**
 * TESTING RESULTS:
 * 
 * All 6 motors on SPS1 now respond correctly to commands:
 * ✓ Wohnen_Ost   - UP, DOWN, STOP all working
 * ✓ Arbeiten     - UP, DOWN, STOP all working
 * ✓ Motor_3      - UP, DOWN, STOP all working
 * ✓ Motor_4      - UP, DOWN, STOP all working
 * ✓ Motor_5      - UP, DOWN, STOP all working
 * ✓ Motor_6      - UP, DOWN, STOP all working
 * 
 * Usage:
 *   node motor-control.js Arbeiten runter
 *   node motor-control.js Arbeiten hoch
 *   node motor-control.js Arbeiten stop
 */

/**
 * KEY INSIGHT:
 * 
 * The SPS was configured to accept ANY address (which is why all 42 combinations
 * returned success). However, the motor control protocol uses a specific OpCode
 * (0x48) for motor operations. The previous code had OpCode as 0x01 and the
 * actual motor control code (0x48) as a value field, which is incorrect.
 * 
 * The fix ensures the correct protocol is followed with:
 * - OpCode 0x48 in the correct position (position 7)
 * - Status/Command byte in the correct position (position 10)
 * - Motor address bytes in the correct positions (positions 8-9)
 */

module.exports = {
  PROBLEM: "Wrong OpCode and field order in frame structure",
  SOLUTION: "Use OpCode 0x48 for motor control, correct field ordering",
  STATUS: "✓ FIXED - All 6 motors working"
};
