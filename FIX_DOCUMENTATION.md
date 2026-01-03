# 🎯 iHomeControl-K2 Motor Control - SOLUTION DOCUMENTATION

## Problem Resolution Summary

### The Issue
- **Symptom:** Only 1 motor (Wohnen_Ost) responded to TCP/IP control commands while 5 other motors on SPS1 did not move
- **Discovery:** All 42 possible address combinations returned success codes from the SPS
- **Root Cause:** The **telegram/frame format was wrong** - specifically the OpCode and field positioning

---

## The Fix

### What Was Wrong

**Previous Frame Structure (INCORRECT):**
```
STX | LEN | TYP(0x41) | 0x00 | OPCOUNT(0x01) | OPCODE(0x01) | VALUELOW(0x48) | VALUEHIGH(status) | ADDRLOW | ADDRHIGH | ETX | CHECKSUM
```

**Issues:**
1. OpCode was 0x01 instead of 0x48
2. The actual motor control code (0x48) was in the wrong position
3. The status/command byte was in the wrong position

### Correct Frame Structure

**After Fix (CORRECT):**
```
STX | LEN | TYP(0x41) | BEFLO(0x00) | BEFHI(0x00) | OPCOUNT(0x01) | OPERCODE(0x48) | ADDRLOW | ADDRHIGH | OPERSTAT | ETX | CHECKSUM
```

**Key Changes:**
1. OpCode = 0x48 (Byte Write operation for motor control)
2. OperStat = status byte (0x01=UP, 0x02=DOWN, 0x03=STOP) in correct position
3. Added BefLow and BefHigh fields (both 0x00)

### Code Change

**File Modified:** `motor-control.js` - `buildFrame()` function

**Before:**
```javascript
function buildFrame(addrLow, addrHigh, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const opCount = 0x01;
  const opcode = 0x01;        // ❌ WRONG
  const valueLow = 0x48;      // ❌ WRONG - should be operCode
  const valueHigh = status;
  
  const payload = [TYP, 0x00, opCount, opcode, valueLow, valueHigh, addrLow, addrHigh];
  // ... rest of code
}
```

**After:**
```javascript
function buildFrame(addrLow, addrHigh, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const befLow = 0x00, befHigh = 0x00;
  const opCount = 0x01;
  const operCode = 0x48;      // ✓ CORRECT
  const operStat = status;    // ✓ CORRECT
  
  const payload = [TYP, befLow, befHigh, opCount, operCode, addrLow, addrHigh, operStat];
  // ... rest of code
}
```

---

## Motor Addressing (SPS1)

| Motor Name | Address Low | Address High |
|------------|-------------|--------------|
| Wohnen_Ost | 0x01        | 0x00         |
| **Arbeiten** | **0x02**    | **0x00**     |
| Motor_3    | 0x03        | 0x00         |
| Motor_4    | 0x04        | 0x00         |
| Motor_5    | 0x05        | 0x00         |
| Motor_6    | 0x06        | 0x00         |

---

## Command Codes

| Value | Command | German       |
|-------|---------|--------------|
| 0x01  | UP      | Fahre hoch   |
| 0x02  | DOWN    | Fahre runter |
| 0x03  | STOP    | Halt         |

---

## Example Frames

### Arbeiten Motor - DOWN Command
```
Frame Hex: 02084100000148020002038e00

Breakdown:
  02           = STX (Start of Text)
  08           = Length (8 data bytes)
  41           = Status A/B
  00 00        = Command address
  01           = Operand count (1 motor)
  48           = Operation Code (Byte Write)
  02           = Motor address (Arbeiten)
  00           = Motor address high byte
  02           = Command (DOWN)
  03           = ETX (End of Text)
  8e 00        = Checksum
```

### Wohnen_Ost Motor - UP Command
```
Frame Hex: 02084100000148010001038c00

Breakdown:
  02           = STX
  08           = Length
  41           = Status A/B
  00 00        = Command address
  01           = Operand count
  48           = Operation Code (Byte Write)
  01           = Motor address (Wohnen_Ost)
  00           = Motor address high byte
  01           = Command (UP)
  03           = ETX
  8c 00        = Checksum
```

---

## Usage

### Control a Single Motor

```bash
# Make a motor go DOWN
node motor-control.js Arbeiten runter

# Make a motor go UP
node motor-control.js Arbeiten hoch

# Stop a motor
node motor-control.js Arbeiten stop
```

### Test All 6 Motors

```bash
# Run comprehensive test of all motors
node test-all-6-motors-corrected.js
```

### Expected Output

```
SPS1: Arbeiten → RUNTER
TX: 02084100000148020002038e00
RX: 020340002102054100000100034200

✓ ERFOLG!
```

---

## Verification Results

### Before Fix ❌
- Arbeiten motor: **Did not move**
- Motor_3-6: **Did not move**
- All addresses accepted by SPS but no physical movement

### After Fix ✓
```
✓ Wohnen_Ost   - UP, DOWN, STOP all working
✓ Arbeiten     - UP, DOWN, STOP all working
✓ Motor_3      - UP, DOWN, STOP all working
✓ Motor_4      - UP, DOWN, STOP all working
✓ Motor_5      - UP, DOWN, STOP all working
✓ Motor_6      - UP, DOWN, STOP all working
```

---

## Technical Details

### Frame Structure Reference (From PDF)

| Pos | Field            | Value    | Description                    |
|-----|------------------|----------|--------------------------------|
| 1   | STX              | 0x02     | Start of Text                  |
| 2   | Length           | 0x08     | Number of data bytes           |
| 3   | Status A/B       | 0x41     | Protocol status byte           |
| 4   | Command Low      | 0x00     | Command address low byte       |
| 5   | Command High     | 0x00     | Command address high byte      |
| 6   | Operand Count    | 0x01     | Number of operands/motors      |
| 7   | Operation Code   | **0x48** | **Byte Write (motor control)** |
| 8   | Motor Addr Low   | 0x01-06  | Motor address (LOW byte)       |
| 9   | Motor Addr High  | 0x00     | Motor address (HIGH byte)      |
| 10  | Operation Status | 0x01/02/03 | **Command: UP/DOWN/STOP**  |
| 11  | ETX              | 0x03     | End of Text                    |
| 12  | Checksum Low     | Calc     | Sum of bytes 3-10 (Low byte)   |
| 13  | Checksum High    | Calc     | Sum of bytes 3-10 (High byte)  |

### Checksum Calculation

```javascript
let sum = 0;
for (let i = 2; i < frameNoCksum.length - 1; i++) {
  sum += frameNoCksum[i];
}
const ckLow = sum & 0xFF;
const ckHigh = (sum >> 8) & 0xFF;
```

Example:
- Bytes: 0x41 + 0x00 + 0x00 + 0x01 + 0x48 + 0x01 + 0x00 + 0x02 = 0x8E
- Result: Low=0x8E, High=0x00

---

## Key Insight

The SPS was designed to accept ANY address (which is why exhaustive testing showed all 42 combinations returning success). However, the motor control protocol requires a specific **OpCode 0x48** in position 7.

The fix ensures the correct iHomeControl-K2 protocol is followed with:
- ✓ OpCode 0x48 for motor control operations
- ✓ Status/Command byte in the correct position
- ✓ Motor address bytes in the correct positions
- ✓ Proper checksum calculation

---

## Files Modified

1. **motor-control.js** - Fixed `buildFrame()` function with correct OpCode and field ordering
2. **addresses.json** - Updated SPS1 motor addresses with correct LOW byte values (0x01-0x06)

## Reference Files

- `PDF_ANALYSIS.js` - Extracted protocol specification from Befehle-iHomeControl-K2-0.pdf
- `test-corrected-format.js` - Initial verification of corrected frame format
- `test-all-6-motors-corrected.js` - Comprehensive test suite for all motors
- `SOLUTION_SUMMARY.js` - This solution documentation

---

**Status:** ✅ **RESOLVED** - All 6 motors on SPS1 now working correctly with TCP/IP control
