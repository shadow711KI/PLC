# PLC Smart Home - AI Coding Instructions

## Project Overview

React/TypeScript frontend with Node.js backend controlling 15 physical blinds/motors across 3 SPS (PLC) stations via custom TCP hex protocol. Manages motor commands (up/down/stop), time scheduling (Zeitautomatik), and status queries.

## Architecture

### Component Structure
- **Frontend**: `react-motor-control/` - Vite + React 18 + TypeScript, runs on port 5173
- **Backend**: `react-motor-control/server/index.ts` - Express API on port 3001, handles TCP communication with SPS
- **Legacy CLI**: Root directory scripts (`motor-control-interactive.js`, `backend-api.js`) - Original testing/debugging tools
- **Configuration**: `addresses.json` (SPS topology), `motor-config.json` (UI display), `room-config.json` (room groupings)

### SPS Communication Layer
All motor control flows through custom TCP hex protocol to 3 SPS stations:
- SPS1: `192.168.178.234:1001` (6 motors: Wohnen_Ost, Wohnen_Sued_*, Wohnen_West_*, Arbeiten)
- SPS2: `192.168.178.234:1002` (6 motors: Schlafen_Sued, Anna_*, Fitnessraum, Frida, Treppe)  
- SPS3: `192.168.178.235:1003` (3 motors: Bad, Schlafen_Ankleide, Schlafen_Osten)

Motor addressing uses `motorNr` (1-6 per SPS) + `addrLow`/`addrHigh` bytes from `addresses.json`.

## Critical Protocol Implementation

### Frame Construction - MUST FOLLOW EXACTLY
The frame format was debugged extensively (see [SOLUTION_SUMMARY.js](../SOLUTION_SUMMARY.js)). **DO NOT** modify without understanding this history.

**Correct motor command frame** (OpCode 0x48):
```javascript
[STX, LEN, TYP, BEF_LOW, BEF_HIGH, OPCOUNT, 0x48, addrLow, addrHigh, operStat, ETX, ckLow, ckHigh]
```
- `operStat`: 0x01=UP, 0x02=DOWN, 0x03=STOP
- Checksum: sum of bytes from TYP to operStat inclusive

**STOP command requires special 27-byte frame** - see `buildStopFrame()` in [motor-control-interactive.js](../motor-control-interactive.js#L68-L100)

### Status Byte Calculation
**ALWAYS** use `sps-statusbyte-helper.js` for address computation:
```javascript
const { getStatusByte48, getStatusWord69 } = require('./sps-statusbyte-helper');
const statusByte = parseInt(getStatusByte48(motorNr, 'hoch'), 16); // motorNr 1-6, command: 'hoch'|'runter'|'stop'
```
Formula: `(motorNr - 1) * 0x10 + commandOffset` - This is hardcoded PLC memory mapping, not arbitrary.

### Zeitautomatik (Time Scheduling)
32-bit encoding for each schedule point (6 points per motor):
```javascript
// Bits 0: action (0=down, 1=up)
// Bits 1-6: minute (0-59)  
// Bits 7-11: hour (0-23)
// Bits 12-18: weekday mask (binary flags: Mo-So)
// Bits 19-31: CONSTANT 0x101F (protocol magic number)
```
READ uses OpCode 0x00, WRITE uses OpCode 0x01 with 6 operands (OpCode 0x69). See [server/index.ts](../react-motor-control/server/index.ts#L33-L88) `buildZeitautomatikWriteFrame()`.

**CRITICAL: Automatik Enable/Disable Protocol**
- **Frame**: 14-byte `02 09 41 00 01 01 69 [ADDR] 00 [VALUE] 00 03 [CK]`
- **OpCode**: 0x69 (Word Write)
- **Address**: Use `getStatusWord69(motorNr, 'autom_ein_aus')` from `sps-statusbyte-helper.js`
- **⚠️ INVERTED LOGIC**: `0x00 = AN (enabled)`, `0x01 = AUS (disabled)` - Counter-intuitive but verified against hardware!
- **Status Query**: 72-byte telegram returns 41-byte response (5-byte ACK + 36-byte data)
- **Response Parsing**: Automatik bytes at offset 18-29 in data frame (2 bytes per motor, use first byte)
- **ACK Frame Handling**: Always check for 5-byte ACK prefix (`02 03 40 00 21`) and skip with `buffer.slice(5)`

## Developer Workflows

### Starting the Application
```bash
# From root directory
START-ALL.bat              # Starts both frontend (5173) + backend (3001)

# OR manually from react-motor-control/
npm run start              # Parallel: npm run dev + npm run server
npm run dev                # Frontend only (Vite)
npm run server             # Backend only (tsx server/index.ts)
```

### Testing Motor Commands (Legacy CLI)
```bash
node motor-control-interactive.js   # Interactive CLI for direct motor control
# Prompts: Select motor → Select action (HOCH/RUNTER/STOP) → Sends TCP frame
```

### Common Debugging Patterns
- **SPS responses logged**: `react-motor-control/server/sps-responses.log` - All TCP traffic with timestamps
- **Frame analysis**: Many `test-*.js` scripts in root for protocol validation
- **Status queries**: `buildStatusQueryFrame()` + `parseStatusResponse()` in [server/index.ts](../react-motor-control/server/index.ts) - Query motor status before commands

## Project-Specific Conventions

### File Naming
- `test-*.js`: Protocol debugging/exploration scripts (often one-off experiments)
- `*-interactive.js`: CLI tools with readline prompts
- `analyze-*.js` / `decode-*.js`: Protocol reverse-engineering from captured sessions
- No tests/ directory - testing is manual via physical motors

### Configuration Files
- **addresses.json**: Source of truth for SPS topology (host/port/motors per SPS)
- **motor-config.json**: UI display names + runtime estimates
- **room-config.json**: Groups motors by room for UI organization
- Changes require server restart (`npm run server` in react-motor-control/)

### Motor IDs vs. motorNr
- `motorNr`: 1-6 within each SPS (used in protocol frames)
- `id` in motor-config.json: Global unique ID 1-15 (UI layer)
- Mapping: SPS1 motors get ids 1-6, SPS2 gets 7-12, SPS3 gets 13-15

## Key Integration Points

### Frontend → Backend API
```typescript
POST /api/motor/control         // Send motor command
GET  /api/motors/config         // Load motor-config.json
POST /api/zeitautomatik/read    // Read schedule for motor
POST /api/zeitautomatik/write   // Update schedule
POST /api/rooms/order           // Save room display order
```

### Backend → SPS TCP Protocol
Backend maintains **persistent TCP connections** per SPS. Frames include checksums - use helper functions, never hand-craft bytes.

## Common Pitfalls

1. **Frame checksum errors**: Always use `buildFrame()` patterns from existing code, don't manually construct frames
2. **Motor addressing**: `addrLow`/`addrHigh` from addresses.json, NOT motor IDs
3. **STOP command**: Requires 27-byte frame with 4 operands, not standard 13-byte frame
4. **Zeitautomatik bits**: High 13 bits MUST be 0x101F, or SPS rejects frame
5. **TCP timeout**: Default 3000ms in server, SPS may not respond to malformed frames (silent failure)
6. **⚠️ INVERTED AUTOMATIK LOGIC**: Status byte 0x00 = enabled, 0x01 = disabled (opposite of intuitive boolean logic!)
7. **Motor number mapping**: Use technical name lookup (`motorNumberMapping`), NOT array index - SPS3 has gaps (motors 2,3,4 only)
8. **ACK frame prefix**: Status responses include 5-byte ACK that must be skipped before parsing data frame

## Documentation References

- [SOLUTION_SUMMARY.js](../SOLUTION_SUMMARY.js): Root cause of original frame format bug
- [STATUS_QUERY_INTEGRATION.md](../STATUS_QUERY_INTEGRATION.md): How status queries work
- [APP_FRONTEND_README.md](../APP_FRONTEND_README.md): Original HTML prototype design
- [react-motor-control/README.md](../react-motor-control/README.md): Modern React app structure
