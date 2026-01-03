// Write Zeitautomatik points for a motor
import fs from 'fs';
export async function writeZeitautomatikPoints(spsHost: string, spsPort: number, motorNr: number, points: any[], motor: string, zeitautomatikPath: string, zeitautomatikData: { motors: Record<string, any[]> }): Promise<boolean> {
    // TODO: Avoid circular dependency for writeZeitautomatikToSPS if needed
    // Directly call the function if available in this file
    // If not, refactor to avoid circular import
    throw new Error('writeZeitautomatikToSPS must be refactored for ESM compatibility.');
}
// Enable/disable Zeitautomatik for a motor
import { getStatusWord69 } from '../../sps-statusbyte-helper';
export async function setZeitautomatikEnabled(spsHost: string, spsPort: number, motorNr: number, enabled: boolean): Promise<boolean> {
    // Frame bauen: 02 09 41 00 01 01 69 [ADDR] 00 [VALUE] 00 03 [CK]
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const addrHex = getStatusWord69(motorNr, 'autom_ein_aus');
    const addr = parseInt(addrHex, 16);
    // PROTOCOL LOGIC: 0x00 = AN (enabled), 0x01 = AUS (disabled)
    const value = enabled ? 0x00 : 0x01;
    const payload = [TYP, 0x00, 0x01, 0x01, 0x69, addr, 0x00, value, 0x00];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);
    return await new Promise<boolean>((resolve) => {
        const socket = net.createConnection({ host: spsHost, port: spsPort });
        let responseReceived = false;
        let timeoutHandle: NodeJS.Timeout;
        socket.on('connect', () => socket.write(frame));
        socket.on('data', (data) => {
            responseReceived = true;
            logTelegram('RECV', `Zeitautomatik ENABLE Motor ${motorNr} chunk → ${spsHost}:${spsPort}`, data.toString('hex'));
            logSPSResponse(data.toString('hex'), `Zeitautomatik ENABLE Motor ${motorNr}`);
        });
        socket.on('error', () => { clearTimeout(timeoutHandle); resolve(false); });
        socket.on('close', () => {
            clearTimeout(timeoutHandle);
            logTelegram('RECV', `Zeitautomatik ENABLE Motor ${motorNr} socket closed`, responseReceived ? 'response=yes' : 'response=no');
            resolve(responseReceived);
        });
        timeoutHandle = setTimeout(() => { socket.destroy(); resolve(responseReceived); }, 250);
    });
}
import { buildMotorTimesReadFrame, buildMotorTimesWriteFrame, parseMotorTimesResponse } from './protocol';

// Motor-Laufzeiten / Wendezeit / Antippzeiten lesen
export function readMotorTimes(host: string, port: number, motorNr: number): Promise<any | null> {
    return new Promise((resolve) => {
        const frame = buildMotorTimesReadFrame(motorNr);
        logTelegram('SEND', `MotorTimes READ Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
        const socket = net.createConnection({ host, port });
        let response = Buffer.alloc(0);
        let timeoutHandle: NodeJS.Timeout;

        socket.on('connect', () => socket.write(frame));
        socket.on('data', (data) => {
            response = Buffer.concat([response, data]);
            logTelegram('RECV', `MotorTimes READ Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
            logSPSResponse(data.toString('hex'), `MotorTimes READ Motor ${motorNr}`);
        });
        socket.on('end', () => {
            clearTimeout(timeoutHandle);
            socket.destroy();
            logTelegram('RECV', `MotorTimes READ Motor ${motorNr} komplett`, response.toString('hex'));
            resolve(parseMotorTimesResponse(response));
        });
        socket.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });

        timeoutHandle = setTimeout(() => { socket.destroy(); resolve(parseMotorTimesResponse(response)); }, 250);
    });
}

// Motor-Laufzeiten / Wendezeit / Antippzeiten schreiben
export function writeMotorTimes(host: string, port: number, motorNr: number, values: { laufzeitHoch: number; laufzeitRunter: number; antipzeitHoch: number; antipzeitRunter: number; wendezeit: number; }) {
    return new Promise<boolean>((resolve) => {
        const frame = buildMotorTimesWriteFrame(motorNr, values);
        logTelegram('SEND', `MotorTimes WRITE Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
        const socket = net.createConnection({ host, port });
        let responseReceived = false;
        let timeoutHandle: NodeJS.Timeout;

        socket.on('connect', () => socket.write(frame));
        socket.on('data', (data) => {
            responseReceived = true;
            logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
            logSPSResponse(data.toString('hex'), `MotorTimes WRITE Motor ${motorNr}`);
        });
        socket.on('error', () => { clearTimeout(timeoutHandle); resolve(false); });
        socket.on('close', () => {
            clearTimeout(timeoutHandle);
            logTelegram('RECV', `MotorTimes WRITE Motor ${motorNr} socket closed`, responseReceived ? 'response=yes' : 'response=no');
            resolve(responseReceived);
        });

        timeoutHandle = setTimeout(() => { socket.destroy(); resolve(responseReceived); }, 250);
    });
}
import { logSPSResponse, logTelegram } from './protocol';
import net from 'net';

// Zeitpunkte von SPS lesen (TCP)
export function readZeitautomatikFromSPS(host: string, port: number, motorNr: MotorNr): Promise<Buffer | null> {
    return new Promise((resolve) => {
        // buildZeitautomatikReadFrame is still in index.ts, so import it if/when moved
        // For now, require from index.ts (circular, but will fix in next step)
        // TODO: Move buildZeitautomatikReadFrame to protocol.ts and import here
        // TODO: Move buildZeitautomatikReadFrame to protocol.ts and import here for ESM compatibility
        throw new Error('buildZeitautomatikReadFrame must be refactored for ESM compatibility.');
        const sock = net.createConnection({ host, port, timeout: 250 });
        let response = Buffer.alloc(0);
        let timeoutHandle: NodeJS.Timeout;
        sock.on('connect', () => {
            logTelegram('SEND', `ZeitAuto READ Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
            sock.write(frame);
        });
        sock.on('data', (data) => {
            response = Buffer.concat([response, data]);
            logTelegram('RECV', `ZeitAuto READ Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
            logSPSResponse(data.toString('hex'), `ZeitAuto READ Motor ${motorNr}`);
        });
        sock.on('end', () => {
            clearTimeout(timeoutHandle);
            sock.destroy();
            logTelegram('RECV', `ZeitAuto READ Motor ${motorNr} komplett → ${host}:${port}`, response.toString('hex'));
            resolve(response);
        });
        sock.on('error', (err) => {
            clearTimeout(timeoutHandle);
            resolve(null);
        });
        timeoutHandle = setTimeout(() => {
            sock.destroy();
            resolve(response.length > 0 ? response : null);
        }, 250);
    });
}
// services.ts - SPS/motor service functions
import type { MotorNr, TimePoint } from './types';
import { buildZeitautomatikWriteFrame, logTelegram, logSPSResponse } from './protocol';
import net from 'net';

// Zeitpunkte an SPS schreiben (TCP)
export function writeZeitautomatikToSPS(host: string, port: number, motorNr: MotorNr, points: TimePoint[]): Promise<Buffer | null> {
    return new Promise((resolve) => {
        const frame = buildZeitautomatikWriteFrame(motorNr, points);
        logTelegram('SEND', `ZeitAuto WRITE Motor ${motorNr} → ${host}:${port}`, frame.toString('hex'));
        const sock = net.createConnection({ host, port });
        let response = Buffer.alloc(0);
        let timeoutHandle: NodeJS.Timeout;
        sock.on('connect', () => { sock.write(frame); });
        sock.on('data', (data) => {
            response = Buffer.concat([response, data]);
            logTelegram('RECV', `ZeitAuto WRITE Motor ${motorNr} chunk → ${host}:${port}`, data.toString('hex'));
            logSPSResponse(data.toString('hex'), 'Zeitautomatik WRITE');
            if (response.length >= 10) {
                clearTimeout(timeoutHandle);
                sock.destroy();
                logTelegram('RECV', `ZeitAuto WRITE Motor ${motorNr} komplett → ${host}:${port}`, response.toString('hex'));
                resolve(response);
            }
        });
        sock.on('end', () => {
            clearTimeout(timeoutHandle);
            sock.destroy();
            console.log('⚠️ Socket closed, total received:', response.length, 'bytes');
            resolve(response);
        });
        sock.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });
        timeoutHandle = setTimeout(() => {
            console.log('⏱️ Timeout reached, received:', response.length, 'bytes');
            sock.destroy();
            resolve(response.length > 0 ? response : null);
        }, 250);
    });
}
