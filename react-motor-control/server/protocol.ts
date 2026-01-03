// Motor-Laufzeiten / Wendezeit / Antippzeiten Frame-Builder und Parser
import { getStatusWord69, getStatusByte48 } from '../../sps-statusbyte-helper.js';

export function buildMotorTimesReadFrame(motorNr: number): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const payload = [TYP, 0x00, 0x00, 0x05]; // station=0, opcode=read(0x00), count=5 words
    const fields = ['laufzeit_hoch', 'laufzeit_runter', 'antipzeit_hoch', 'antipzeit_runter', 'wendzeit'];
    for (const field of fields) {
        const addrHex = getStatusWord69(motorNr, field);
        const addr = parseInt(addrHex, 16);
        payload.push(0x69, addr, 0x00);
    }
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

export function buildMotorTimesWriteFrame(motorNr: number, values: { laufzeitHoch: number; laufzeitRunter: number; antipzeitHoch: number; antipzeitRunter: number; wendezeit: number; }): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const payload = [TYP, 0x00, 0x01, 0x05]; // station=0, opcode=write(0x01), count=5
    const order: Array<[keyof typeof values, string]> = [
        ['laufzeitHoch', 'laufzeit_hoch'],
        ['laufzeitRunter', 'laufzeit_runter'],
        ['antipzeitHoch', 'antipzeit_hoch'],
        ['antipzeitRunter', 'antipzeit_runter'],
        ['wendezeit', 'wendzeit']
    ];
    for (const [field, mapKey] of order) {
        const addrHex = getStatusWord69(motorNr, mapKey);
        const addr = parseInt(addrHex, 16);
        const val = Math.max(0, Math.min(0xFFFF, values[field] ?? 0));
        const low = val & 0xFF;
        const high = (val >> 8) & 0xFF;
        payload.push(0x69, addr, 0x00, low, high);
    }
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

export function parseMotorTimesResponse(buffer: Buffer) {
    // Erwartet: optional 5-byte ACK (02 03 40 00 21) + Datenframe
    if (!buffer || buffer.length < 12) return null;

    let dataFrame = buffer;
    if (buffer[0] === 0x02 && buffer[1] === 0x03) {
        dataFrame = buffer.slice(5);
    }

    // Datenframe: 02 [LEN] 41 00 00 05 <v1low v1high> ... <v5low v5high> 03 [ck]
    if (dataFrame.length < 6 + (5 * 2) + 3) return null;
    const count = dataFrame[5];
    if (count < 5) return null;

    const values: number[] = [];
    let offset = 6;
    for (let i = 0; i < 5; i++) {
        const low = dataFrame[offset];
        const high = dataFrame[offset + 1];
        // SPS speichert Zeiten in Zehntelsekunden (0.1s) - keine Umrechnung mehr, Wert wird roh weitergegeben
        const valueInTenthSeconds = (high << 8) | low;
        values.push(valueInTenthSeconds);
        offset += 2;
    }

    const [laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit] = values;
    return { laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit };
}
// Helper: current time string
export function nowTime() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Helper: log telegrams
export function logTelegram(direction: 'SEND' | 'RECV', label: string, hex: string) {
    const bytes = Math.ceil((hex?.length || 0) / 2);
    console.log(`[${nowTime()}] [${bytes} bytes] ${label} ${direction}: ${hex}`);
}
// SPS-Antwort loggen
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function logSPSResponse(hex: string, description: string) {
    const timestamp = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logEntry = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n[${timestamp}] SPS-ANTWORT\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAktion:    ${description}\nLänge:     ${hex.length / 2} bytes\nHEX:       ${hex}\n`;
    const logPath = path.join(__dirname, 'sps-responses.log');
    try {
        fs.appendFileSync(logPath, logEntry, 'utf-8');
    } catch (err) {
        console.error('❌ Fehler beim Schreiben der SPS-Antwort-Log:', err);
    }
}
// Query SPS Status (72-Byte Telegramm)
import net from 'net';
export function querySPSStatus72(
    host: string,
    port: number,
    spsMapping: Record<string, { host: string; port: number; motors: Record<string, { nr: number }> }>
): Promise<Record<number, { status: string; automatik?: boolean }> | null> {
    return new Promise((resolve) => {
        const frame = buildSPSStatusQueryFrame(port);
        const socket = net.createConnection({ host, port, timeout: 3000 });
        let response = Buffer.alloc(0);
        let timeoutHandle: NodeJS.Timeout;
        let finished = false;

        function finish(result: any) {
            if (finished) return;
            finished = true;
            try { socket.destroy(); } catch (e) { }
            setTimeout(() => resolve(result), 200); // 200ms Delay nach Socket-Schließung
        }

        socket.on('connect', () => {
            socket.write(frame);
        });
        socket.on('data', (data) => {
            response = Buffer.concat([response, data]);
        });
        socket.on('end', () => {
            clearTimeout(timeoutHandle);
            let spsName: string | undefined = undefined;
            for (const key of Object.keys(spsMapping)) {
                if (spsMapping[key].host === host && spsMapping[key].port === port) {
                    spsName = key;
                    break;
                }
            }
            const parsed = parseSPSStatusResponse(response, spsName, spsMapping);
            finish(parsed);
        });
        socket.on('error', (err) => {
            clearTimeout(timeoutHandle);
            finish(null);
        });
        timeoutHandle = setTimeout(() => {
            finish(response.length > 0 ? (() => {
                let spsName: string | undefined = undefined;
                for (const key of Object.keys(spsMapping)) {
                    if (spsMapping[key].host === host && spsMapping[key].port === port) {
                        spsName = key;
                        break;
                    }
                }
                return parseSPSStatusResponse(response, spsName, spsMapping);
            })() : null);
        }, 300);
    });
}
// Parse SPS Status-Query Response
export function parseSPSStatusResponse(
    buffer: Buffer,
    spsName: string | undefined,
    spsMapping: Record<string, { motors: Record<string, { nr: number }> }>
): Record<number, { status: string, automatik?: boolean }> {
    const result: Record<number, { status: string, automatik?: boolean }> = {};
    if (!buffer || buffer.length < 30) return result;
    let dataFrame = buffer;
    if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
        dataFrame = buffer.slice(5);
    }
    let motorCount = 6;
    if (spsName && spsMapping[spsName]) {
        motorCount = Object.keys(spsMapping[spsName].motors).length;
    }
    // --- SPS3: Only process motorNr 2,3,4 ---
    let motorNumbers: number[];
    if (spsName === 'SPS3') {
        motorNumbers = [2, 3, 4];
    } else {
        motorNumbers = Array.from({ length: motorCount }, (_, i) => i + 1);
    }
    for (const motorNr of motorNumbers) {
        const posOffset = 6 + ((motorNr - 1) * 2);
        let status = 'unbekannt';
        let automatik: boolean | null = null;
        if (posOffset + 1 < dataFrame.length) {
            const b1 = dataFrame[posOffset];
            const b2 = dataFrame[posOffset + 1];
            if (b1 === 0x01 && b2 === 0x00) {
                status = 'hoch';
            } else if (b1 === 0x00 && b2 === 0x01) {
                status = 'runter';
            } else if (b1 === 0x00 && b2 === 0x00) {
                status = 'stop';
            } else {
                status = 'unbekannt';
            }
            let automOffset = 18 + ((motorNr - 1) * 2);
            if (automOffset < dataFrame.length) {
                const automByte = dataFrame[automOffset];
                automatik = automByte === 0x00;
            } else {
                automatik = null; // Explicitly unknown
            }
            let motorName = '';
            if (spsName && spsMapping[spsName]) {
                for (const [name, info] of Object.entries(spsMapping[spsName].motors)) {
                    if ((info as { nr: number }).nr === motorNr) {
                        motorName = name;
                        break;
                    }
                }
            }
            const displayName = (motorName ? motorName : `Motor ${motorNr}`).padEnd(20, ' ');
            const now = new Date();
            const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
            const timestamp = `${now.getFullYear()} ${pad(now.getMonth() + 1)} ${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
            const logMsg = `${timestamp} [SPS-STATUS] ${spsName || ''} Motor: ${displayName} | Status-Bytes: ${b1.toString(16).padStart(2, '0').toUpperCase()} ${b2.toString(16).padStart(2, '0').toUpperCase()} | Status: ${status} | Automatik: ${automatik === null ? '-' : (automatik ? 'AN' : 'AUS')}`;
            console.log(logMsg);
            try {
                fs.appendFileSync(path.join(__dirname, 'sps-responses.log'), logMsg + '\n', 'utf-8');
            } catch (err) { }
            result[motorNr] = { status, automatik };
        } else {
            // Always include automatik property, null if unknown
            result[motorNr] = { status, automatik };
        }
    }
    return result;
}
// 72-Byte Status-Query Frame
export function buildSPSStatusQueryFrame(spsPort: number): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const payload = [TYP, 0x00, 0x00, 0x15];
    for (let motorNr = 1; motorNr <= 6; motorNr++) {
        const addrOben = parseInt(getStatusByte48(motorNr, 'position_oben'), 16);
        payload.push(0x48, addrOben, 0x00);
        const addrUnten = parseInt(getStatusByte48(motorNr, 'position_unten'), 16);
        payload.push(0x48, addrUnten, 0x00);
    }
    for (let motorNr = 1; motorNr <= 6; motorNr++) {
        const addrHex = getStatusWord69(motorNr, 'autom_ein_aus');
        const addr = parseInt(addrHex, 16);
        payload.push(0x69, addr, 0x00);
    }
    payload.push(0x48, 0x10, 0x00);
    payload.push(0x48, 0x20, 0x00);
    payload.push(0x48, 0x30, 0x00);
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}
// protocol.ts - SPS protocol frame building and parsing
import type { MotorNr, TimePoint } from './types';
import path from 'path';
import fs from 'fs';

// already imported above

// Zeitautomatik Write Frame
export function buildZeitautomatikWriteFrame(motorNr: MotorNr, points: TimePoint[]) {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const OPCODE = 0x01;
    const COUNT = 0x06;
    const payload = [TYP, STATION, OPCODE, COUNT];
    for (let i = 0; i < 6; i++) {
        const p: TimePoint | undefined = points && points[i] ? points[i] : undefined;
        const addrHex = getStatusWord69(motorNr, `zeitschaltpunkt${i + 1}`);
        const addr = parseInt(addrHex, 16);
        const hour = p && p.hour != null ? p.hour : 0;
        const minute = p && p.minute != null ? p.minute : 0;
        const weekdayMask = p && p.weekdayMask != null ? p.weekdayMask : 0;
        const aktion = p && p.action === 'hoch' ? 1 : 0;
        let value = 0;
        value |= (aktion & 0x1);
        value |= ((minute & 0x3F) << 1);
        value |= ((hour & 0x1F) << 7);
        value |= ((weekdayMask & 0x7F) << 12);
        value |= (0x101F << 19);
        const byte0 = (value >> 24) & 0xFF;
        const byte1 = (value >> 16) & 0xFF;
        const byte2 = (value >> 8) & 0xFF;
        const byte3 = value & 0xFF;
        payload.push(0x69, addr, 0x00, byte0, byte1, byte2, byte3);
    }
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// ... (other protocol helpers to be moved here)
