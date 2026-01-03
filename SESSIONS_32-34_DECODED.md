# Sessions #32-34 Analysis - Decoded from PDF Documentation

## Overview
The PDF `Befehle-iHomeControl-K2-0.pdf` contains the complete iHomeControl-K2 protocol specification. Sessions #32-34 are now **DECODED** and identified!

---

## PDF Command: "Motorlaufzeiten/ Wendezeiten/ Antippzeiten auslesen"
**Translation:** "Read Motor Runtimes / Turn-around Times / Tap Times"

### PDF Reference Frame (Page 1)
```
HEX:  02 13 41 00 00 05 69 01 00 69 02 00 69 05 00 69 03 00 69 04 00 03 62 02
DEC:  65 0  0  5  105 1  0  105 2  0  105 5  0  105 3  0  105 4  0  3  610
```

**Frame Structure:**
- **STX:** 0x02
- **LEN:** 0x13 (19 decimal) = payload length
- **Header:** 0x41 0x00 0x00 (Type A/B = 0x41, Station = 0x00, OpCode Count = 0x00)
- **OpCount:** 0x05 (5 motors)
- **Operands:** 0x69 [motor_id] 0x00 (repeated 5 times)
  - 0x69 0x01 0x00 = Motor 1
  - 0x69 0x02 0x00 = Motor 2
  - 0x69 0x05 0x00 = Motor 5
  - 0x69 0x03 0x00 = Motor 3
  - 0x69 0x04 0x00 = Motor 4
- **ETX:** 0x03
- **Checksum:** 0x62 0x02

**Purpose:** Query multiple motors' operational data (runtimes, timings)

---

## Session #32 (iPhone App - Real Command)
```
HEX: 02 13 41 00 00 05 69 51 00 69 52 00 69 53 00 69 54 00 69 55 00 03 F2 03
```

**Same Structure as PDF, but with different operand offsets:**
- **STX:** 0x02
- **LEN:** 0x13 (19 decimal)
- **Header:** 0x41 0x00 0x00
- **OpCount:** 0x05 (5 motors)
- **Operands:** 0x69 [0x51-0x55] 0x00
  - 0x69 0x51 0x00 = Motor 1 (with 0x50 offset)
  - 0x69 0x52 0x00 = Motor 2 (with 0x50 offset)
  - 0x69 0x53 0x00 = Motor 3 (with 0x50 offset)
  - 0x69 0x54 0x00 = Motor 4 (with 0x50 offset)
  - 0x69 0x55 0x00 = Motor 5 (with 0x50 offset)
- **ETX:** 0x03
- **Checksum:** 0xF2 0x03

**Interpretation:** Query motors 1-5 with operand offset 0x50

---

## Session #33 (iPhone App)
```
HEX: 02 13 41 00 00 05 69 51 00 69 52 00 69 53 00 69 54 00 69 55 00 03 F2 03
```
**IDENTICAL to Session #32** - Probably retransmission or refresh query

---

## Session #34 (iPhone App - Different Offset)
```
HEX: 02 13 41 00 00 05 69 21 00 69 22 00 69 23 00 69 24 00 69 25 00 03 02 03
```

**Same Structure but with different operand offsets:**
- **STX:** 0x02
- **LEN:** 0x13 (19 decimal)
- **Header:** 0x41 0x00 0x00
- **OpCount:** 0x05 (5 motors)
- **Operands:** 0x69 [0x21-0x25] 0x00
  - 0x69 0x21 0x00 = Motor 1 (with 0x20 offset)
  - 0x69 0x22 0x00 = Motor 2 (with 0x20 offset)
  - 0x69 0x23 0x00 = Motor 3 (with 0x20 offset)
  - 0x69 0x24 0x00 = Motor 4 (with 0x20 offset)
  - 0x69 0x25 0x00 = Motor 5 (with 0x20 offset)
- **ETX:** 0x03
- **Checksum:** 0x02 0x03

**Interpretation:** Query motors 1-5 with operand offset 0x20

---

## Key Finding: Three Operand Variants

| Variant | Operands | Range | Example | Meaning |
|---------|----------|-------|---------|---------|
| Base | 0x01-0x05 | Motors 1-5 | `69 01 00` = Motor 1 | PDF standard (runtimes) |
| Offset 0x50 | 0x51-0x55 | Motors 1-5 | `69 51 00` = Motor 1 | Session #32-33 (Status?) |
| Offset 0x20 | 0x21-0x25 | Motors 1-5 | `69 21 00` = Motor 1 | Session #34 (Status?) |

---

## Hypothesis: SPS-Specific Status Queries

Based on the offset patterns, these could be SPS-specific commands:

- **0x01-0x05 (Base):** Runtime/timing data (general query)
- **0x51-0x55 (0x50 offset):** SPS1 motors status query? (Sessions #32-33)
  - Timestamp: 16:20:45 and 16:26:37 (same command repeated)
  - Could be polling SPS1 motor status
  
- **0x21-0x25 (0x20 offset):** SPS2/SPS3 motors status query? (Session #34)
  - Timestamp: 16:27:36
  - Could be polling SPS2/3 motor status after SPS1

---

## Next Steps to Verify

### 1. Test Session #32 Frame on SPS1
```javascript
// Send: 02 13 41 00 00 05 69 51 00 69 52 00 69 53 00 69 54 00 69 55 00 03 F2 03
// Observe: What response does SPS1 return?
// Does it send back status of motors 1-5?
```

### 2. Test Session #34 Frame on SPS2/SPS3
```javascript
// Send: 02 13 41 00 00 05 69 21 00 69 22 00 69 23 00 69 24 00 69 25 00 03 02 03
// Observe: What response do SPS2/3 return?
// Does offset 0x20 work for different SPS?
```

### 3. Implement buildStatusQueryFrame()
Once verified, create a function to build these frames:
```javascript
function buildStatusQueryFrame(motorOffset) {
  // motorOffset = 0x00 (base), 0x50 (SPS1?), or 0x20 (SPS2/3?)
  // Returns 24-byte frame for querying 5 motors
}
```

---

## SPS Mapping Hypothesis

- **SPS1 (port 1001):** Motors 1-6 → Use offset 0x50 (0x51-0x56)?
- **SPS2 (port 1002):** Motors 1-6 → Use offset 0x20 (0x21-0x26)?  
- **SPS3 (port 1003):** Motors 1-3 → Use offset 0x20 (0x21-0x23)?

This would explain why the iPhone app sends different queries to different SPS units!

---

## PDF Documentation Notes

From the PDF "Befehle-iHomeControl-K2-0.pdf":
- Page 1-2: Single motor commands (HOCH, RUNTER, STOP) ✓ Already implemented
- Page 1: "Motorlaufzeiten/Wendezeiten/Antippzeiten auslesen" - Multi-motor QUERY ← **This is Sessions #32-34!**
- Page 1: Reading all motor positions of a station (42-byte frame)
- Page 2-5: Automation control, timing settings, etc.

The Sessions #32-34 follow the documented "Motorlaufzeiten auslesen" pattern exactly!

