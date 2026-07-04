const PORT = 3001;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express, { Request, Response } from 'express';
import cors from 'cors';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import type { MotorNr, SPSName, SPSConfig, MotorInfo, TimePoint, StatusResponse, AppConfig } from './types';
import { buildZeitautomatikWriteFrame, buildSPSStatusQueryFrame, parseSPSStatusResponse, querySPSStatus72, logSPSResponse, logTelegram } from './protocol';
import { writeZeitautomatikToSPS, readZeitautomatikFromSPS } from './services';
import { readMotorTimes, writeMotorTimes } from './services';
import { setZeitautomatikEnabled } from './services';
import { writeZeitautomatikPoints } from './services';

// --- Express app initialization and middleware setup ---
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ESM-compatible dynamic import for sps-statusbyte-helper.js
let getStatusWord69: any;
let getStatusByte48: any;
(async () => {
    const helper = await import('../../sps-statusbyte-helper.js');
    getStatusWord69 = helper.getStatusWord69;
    getStatusByte48 = helper.getStatusByte48;
})();

// ...readZeitautomatikFromSPS now imported from services.ts...

// Hilfsfunktion: Zeitpunkte aus SPS-Response parsen (nach Doku 8.5)
function parseZeitautomatikResponse(buffer: Buffer) {
    // Robustere deutsche Version: Gibt immer alle Felder zurück, auch bei ungültigen Werten
    if (!buffer || buffer.length < 10) {
        console.log('⚠️  Keine gültige SPS-Antwort für Zeitautomatik erhalten');
        return [];
    }

    console.log('📡 SPS-Antwort für Zeitautomatik erhalten:', buffer.toString('hex'), 'Länge:', buffer.length);

    // Erwartete Antwort-Struktur für 6 Zeitpunkte (nach korrigierter Doku):
    // Response enthält 6 Zeitpunkte à 4 Bytes, danach 3 Bytes Abstand
    // Pro Zeitpunkt (4 Bytes):
    //   Byte 0 (bytes[0]): Unbekanntes Byte
    //   Byte 1 (bytes[1]): Bits für Wochentage (Sa=bit2, Fr=bit1, Do=bit0) + weitere in byte 2
    //   Byte 2 (bytes[2]): Bits für Wochentage (Mi=bit7, Di=bit6, Mo=bit5, So=bit4) + Stundenbits (h0-h3 = bits 0-3)
    //   Byte 3 (bytes[3]): Minutenbits (m0-m5 = bits 6-1), Stundenbit h4=bit7, Aktiviert=bit0

    try {
        // SPS-Antwort hat 2 Frames: ACK (5 bytes) + Daten-Frame
        // ACK: 02 03 40 00 21
        // Daten: 02 1C 41 00 00 06 [24 bytes = 6×4 bytes] 03 [checksum]

        // Überspringe ACK-Frame falls vorhanden
        let dataFrame = buffer;
        if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
            dataFrame = buffer.slice(5); // Überspringe ACK-Frame
        }

        // Finde Datenstart nach Header [02 1C 41 00 00 06]
        const dataStart = 6; // Nach STX(02), LEN(1C), TYP(41), STATION(00), ?(00), COUNT(06)
        const timePoints = [];

        // Pro Zeitpunkt: nur 4 Bytes Daten (KEIN Gap in Response!)
        // Neue Bitlogik: Big Endian, Bit 0=Aktion, Bit 1-6=Minute, Bit 7-11=Stunde, Bit 12-18=Wochentage
        for (let i = 0; i < 6; i++) {
            const offset = dataStart + (i * 4); // Nur 4 Bytes pro Zeitpunkt
            if (offset + 4 > dataFrame.length) {
                timePoints.push({
                    id: i + 1,
                    weekdayMask: 0,
                    weekdays: [],
                    hour: null,
                    minute: null,
                    action: 'unbekannt',
                    raw: [null, null, null, null],
                    info: 'Keine Daten empfangen'
                });
                continue;
            }

            const bytes = dataFrame.slice(offset, offset + 4);

            // 4 bytes als 32-Bit-Wert zusammensetzen (Big Endian)
            const value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];

            // Bit 0: Aktion (1 = hoch, 0 = runter)
            const aktion = value & 0x1;

            // Bit 1-6: Minute (6 Bit)
            const minute = (value >> 1) & 0x3F;

            // Bit 7-11: Stunde (5 Bit)
            const stunde = (value >> 7) & 0x1F;

            // Bit 12-18: Wochentage (7 Bit)
            const wochentage = (value >> 12) & 0x7F;

            // Wochentage extrahieren (Bit 18=Sa, 17=Fr, 16=Do, 15=Mi, 14=Di, 13=Mo, 12=So)
            const sa = !!(wochentage & 0x40); // Bit 18
            const fr = !!(wochentage & 0x20); // Bit 17
            const do_ = !!(wochentage & 0x10); // Bit 16
            const mi = !!(wochentage & 0x08); // Bit 15
            const di = !!(wochentage & 0x04); // Bit 14
            const mo = !!(wochentage & 0x02); // Bit 13
            const so = !!(wochentage & 0x01); // Bit 12

            const weekdays = [];
            if (sa) weekdays.push('Sa');
            if (fr) weekdays.push('Fr');
            if (do_) weekdays.push('Do');
            if (mi) weekdays.push('Mi');
            if (di) weekdays.push('Di');
            if (mo) weekdays.push('Mo');
            if (so) weekdays.push('So');

            // Validierung
            const hour = (stunde >= 0 && stunde <= 23) ? stunde : null;
            const validMinute = (minute >= 0 && minute <= 59) ? minute : null;

            // Aktion: 1 = hoch, 0 = runter
            const action = aktion ? 'hoch' : 'runter';

            // Wochentag-Maske berechnen (für Frontend-Bearbeitung)
            const weekdayMask = (so ? 1 : 0) | (mo ? 2 : 0) | (di ? 4 : 0) | (mi ? 8 : 0) | (do_ ? 16 : 0) | (fr ? 32 : 0) | (sa ? 64 : 0);

            // Info-Feld für Debugging
            let info = '';
            if (hour === null) info += 'Stunde ungültig; ';
            if (validMinute === null) info += 'Minute ungültig; ';

            timePoints.push({
                id: i + 1,
                weekdays,
                weekdayMask,
                hour,
                minute: validMinute,
                action,
                raw: Array.from(bytes),
                info: info.trim()
            });
        }

        console.log('📅 Parsierte Zeitpunkte:', timePoints);
        return timePoints;
    } catch (error) {
        console.error('❌ Fehler beim Parsen der Zeitautomatik-Antwort:', error);
        // Im Fehlerfall: 6 leere Zeitpunkte zurückgeben
        return Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            weekdayMask: 0,
            weekdays: [],
            hour: null,
            minute: null,
            action: 'unbekannt',
            raw: [null, null, null, null],
            info: 'Parser-Fehler'
        }));
    }
}

// ────────────────────────────────────────────────────────────
// Motor-Laufzeiten / Wendezeit / Antippzeiten (Opcode 0x69, Word)
// Basierend auf App-Telegrammen (#93-#97) und Zuordnung in sps-statusbyte-helper
// ...read/write motor times now in services.ts, frame builders/parsers in protocol.ts...
// Zeitautomatik Speicherpfad

// Export für Testskripte
export { parseZeitautomatikResponse };
const zeitautomatikPath = path.join(__dirname, 'zeitautomatik-store.json');
let zeitautomatikData: { motors: Record<string, TimePoint[]> } = { motors: {} };
try {
    if (fs.existsSync(zeitautomatikPath)) {
        zeitautomatikData = JSON.parse(fs.readFileSync(zeitautomatikPath, 'utf-8'));
    }
} catch (error) {
    console.error('❌ Fehler beim Laden der Zeitautomatik-Daten:', error);
}

// API: Zeitautomatik auslesen (alle Motoren oder einen)
// API: Zeitautomatik auslesen (direkt von SPS)
app.get('/api/zeitautomatik', async (req: Request, res: Response) => {
    const motor = req.query.motor as string | undefined;
    console.log(`🔍 Zeitautomatik-API aufgerufen für Motor: ${motor}`);
    if (!motor) return res.status(400).json({ success: false, message: 'motor erforderlich' });
    // Motor in Config suchen
    const motorObj = motorConfig.motors.find((m) => m.technicalName === motor);
    console.log(`🔍 Motor gefunden:`, motorObj ? { technicalName: motorObj.technicalName, sps: motorObj.sps } : 'NICHT GEFUNDEN');
    if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    // SPS-Info holen
    const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
    console.log(`🔍 SPS gefunden:`, sps ? { host: sps.host, port: sps.port } : 'NICHT GEFUNDEN');
    if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    let motorNr: number | undefined = undefined;
    if (sps && motorObj.technicalName) {
        motorNr = sps.motors[motorObj.technicalName]?.nr;
    }
    console.log(`🔍 Motor-Nr gefunden: ${motorNr} (für ${motorObj.technicalName})`);
    if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
    // TCP-Request an SPS
    try {
        const spsResponse = await readZeitautomatikFromSPS(sps.host, sps.port, motorNr as MotorNr);
        console.log('--- SPS Zeitautomatik-Response ---');
        if (spsResponse && Buffer.isBuffer(spsResponse)) {
            console.log('HEX:', spsResponse.toString('hex'));
            console.log('Länge:', spsResponse.length);
        } else {
            console.log('Keine Antwort von SPS erhalten.');
        }
        const points = parseZeitautomatikResponse((spsResponse && Buffer.isBuffer(spsResponse)) ? spsResponse : Buffer.alloc(0));
        console.log('✅ Sende Zeitpunkte an Frontend:', points.length, 'Zeitpunkte');
        return res.json({ success: true, data: points });
    } catch (e) {
        console.error('❌ Fehler bei Zeitautomatik-Request:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request', error: String(e) });
    }
});

// API: SPS Status abfragen (72-Byte Telegramm)
app.get('/api/sps/status/:spsName', async (req: Request, res: Response) => {
    console.log('📊 GET /api/sps/status/:spsName aufgerufen');
    const { spsName } = req.params;
    const sps = spsMapping[spsName];
    if (!sps) {
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    }
    try {
        const statusData = await querySPSStatus72(sps.host, sps.port, spsMapping);
        // Mappe Nummern auf technische Namen, auch wenn statusData null/leer ist
        const mappedStatus: Record<string, any> = {};
        for (const [motorName, motorInfo] of Object.entries(sps.motors)) {
            const nr = motorInfo.nr;
            if (statusData && statusData[nr]) {
                mappedStatus[motorName] = {
                    status: statusData[nr].status,
                    automatik: Object.prototype.hasOwnProperty.call(statusData[nr], 'automatik') ? statusData[nr].automatik : null
                };
            } else {
                mappedStatus[motorName] = { status: 'unbekannt', automatik: null };
            }
        }
        console.log('✅ Status-Daten für', spsName, ':', mappedStatus);
        return res.json({ success: true, data: mappedStatus });
    } catch (e) {
        console.error('❌ Fehler bei Status-Query:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Query' });
    }
});

// API: Zeitautomatik Ein/Aus schalten
app.post('/api/zeitautomatik/enable', async (req: Request, res: Response) => {
    console.log('🔄 POST /api/zeitautomatik/enable aufgerufen');
    const { motor, enabled } = req.body;
    console.log('🪝 Request payload:', req.body);
    console.log('🪝 motorConfig.motors displayNames:', motorConfig.motors.map(m => m.displayName));
    console.log('🪝 motorConfig.motors technicalNames:', motorConfig.motors.map(m => m.technicalName));
    // Show both for clarity
    console.log('🪝 motorConfig.motors (displayName/technicalName):', motorConfig.motors.map(m => `${m.displayName} / ${m.technicalName}`));

    if (!motor || enabled === undefined) {
        console.log('❌ Fehler: motor oder enabled fehlt', { motor, enabled });
        return res.status(400).json({ success: false, message: 'motor und enabled erforderlich' });
    }

    // Motor in Config suchen
    // m.name does not exist, use displayName for logging
    const motorObj = motorConfig.motors.find((m) => m.technicalName === motor);
    console.log('🪝 motorObj:', motorObj);
    if (!motorObj) {
        console.log('❌ Motor nicht gefunden:', motor);
        return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    }

    // SPS-Info holen
    const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
    if (!sps) {
        console.log('❌ SPS nicht gefunden:', motorObj.sps);
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    }

    const motorNr = sps.motors[motorObj.technicalName]?.nr;
    console.log('🪝 motorNr:', motorNr);
    if (!motorNr) {
        console.log('❌ Motor-Nr nicht gefunden für:', motorObj.technicalName);
        return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
    }

    // Use service function for Zeitautomatik enable/disable
    try {
        const success = await setZeitautomatikEnabled(sps.host, sps.port, motorNr, enabled);
        const motorName = motorObj.technicalName;
        if (success) {
            console.log(`✅ Automatik ${enabled ? 'AN' : 'AUS'} erfolgreich für ${motorName}`);
            return res.json({ success: true, enabled, motor: motorName });
        } else {
            console.log(`❌ Keine Antwort von SPS für ${motorName}`);
            return res.json({ success: false, message: 'Keine Antwort von SPS', motor: motorName });
        }
    } catch (e) {
        console.error('❌ Fehler bei SPS-Request:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});

// API: Zeitautomatik speichern (ein Motor)
// API: Zeitautomatik speichern (direkt an SPS)
app.post('/api/zeitautomatik', async (req: Request, res: Response) => {
    console.log('📝 POST /api/zeitautomatik aufgerufen');
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    const { motor, points } = req.body;
    if (!motor || !Array.isArray(points)) {
        console.log('❌ Fehler: motor oder points fehlen');
        return res.status(400).json({ success: false, message: 'motor und points erforderlich' });
    }
    // Motor in Config suchen
    const motorObj = motorConfig.motors.find((m) => m.technicalName === motor);
    if (!motorObj) {
        console.log('❌ Motor nicht gefunden:', motor);
        return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    }
    console.log('✓ Motor gefunden:', motorObj.technicalName);
    // SPS-Info holen
    const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
    if (!sps) {
        console.log('❌ SPS nicht gefunden:', motorObj.sps);
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    }
    let motorNr: number | undefined = undefined;
    if (sps && motorObj.technicalName) {
        motorNr = sps.motors[motorObj.technicalName]?.nr;
    }
    if (!motorNr) {
        console.log('❌ Motor-Nr nicht gefunden');
        return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
    }
    console.log('✓ Motor-Nr:', motorNr, 'SPS:', sps.host, sps.port);
    // TCP-Request an SPS
    try {
        console.log('📡 Sende Zeitautomatik-Daten an SPS...');
        const ok = await writeZeitautomatikPoints(sps.host, sps.port, motorNr as MotorNr, points, motor, zeitautomatikPath, zeitautomatikData);
        if (ok) {
            console.log('✓ Zeitautomatik gespeichert für Motor:', motor);
            return res.json({ success: true });
        } else {
            return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
        }
    } catch (e) {
        console.error('❌ Fehler bei SPS-Request:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});

// Lade Motor-Konfiguration
const motorConfigPath = path.join(__dirname, '..', 'motor-config.json');
let motorConfig: { motors: MotorInfo[] };
try {
    const configData = fs.readFileSync(motorConfigPath, 'utf-8');
    motorConfig = JSON.parse(configData);
    console.log(`📄 Motor-Konfiguration geladen: ${motorConfig.motors.length} Motoren`);
} catch (error) {
    console.error('❌ Fehler beim Laden der Motor-Konfiguration:', error);
    motorConfig = { motors: [] };
}

// Lade Raum-Icons Konfiguration
const roomConfigPath = path.join(__dirname, '..', 'room-config.json');
let roomConfig: { rooms: Record<string, { icon: string }>, order?: string[] };
try {
    const configData = fs.readFileSync(roomConfigPath, 'utf-8');
    roomConfig = JSON.parse(configData);
    if (!roomConfig.order) roomConfig.order = [];
    console.log(`📄 Raum-Konfiguration geladen: ${Object.keys(roomConfig.rooms).length} Räume`);
} catch (error) {
    console.log('📄 Erstelle neue Raum-Konfiguration');
    roomConfig = { rooms: {}, order: [] };
    fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
}

// Lade Gruppen-Konfiguration
const groupsConfigPath = path.join(__dirname, '..', 'groups-config.json');
let groupsConfig: { groups: Record<string, string[]>, order?: string[] };
try {
    const configData = fs.readFileSync(groupsConfigPath, 'utf-8');
    groupsConfig = JSON.parse(configData);
    if (!groupsConfig.order) groupsConfig.order = [];
    console.log(`📄 Gruppen-Konfiguration geladen: ${Object.keys(groupsConfig.groups).length} Gruppen`);
} catch (error) {
    console.log('📄 Erstelle neue Gruppen-Konfiguration');
    groupsConfig = { groups: {}, order: [] };
    fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
}

// Globaler Status-Store für alle Motoren (synchronisiert zwischen allen Clients)
const motorStatus: Record<string, string> = {};
// Initialisiere Status für alle Motoren aus Config
motorConfig.motors.forEach((motor: any) => {
    motorStatus[motor.technicalName] = '△';
});

function resolveTechnicalMotorName(name: string): string {
    const hit = motorConfig.motors.find((m: any) =>
        m.technicalName === name || m.displayName === name
    );
    return hit?.technicalName || name;
}

// SPS Adressen mapping (aus addresses.json)
const spsMapping: Record<string, { host: string; port: number; motors: Record<string, { nr: number }> }> = {
    SPS1: {
        host: '192.168.178.234',
        port: 1001,
        motors: {
            'Wohnen_Ost': { nr: 1 },
            'Wohnen_Sued_links': { nr: 2 },
            'Wohnen_Sued_rechts': { nr: 3 },
            'Wohnen_West_links': { nr: 4 },
            'Wohnen_West_rechts': { nr: 5 },
            'Arbeiten': { nr: 6 },
        }
    },
    SPS2: {
        host: '192.168.178.234',
        port: 1002,
        motors: {
            'Schlafen_Sued': { nr: 1 },
            'Anna_Sued': { nr: 2 },
            'Anna_West': { nr: 3 },
            'Fitnessraum': { nr: 4 },
            'Frida': { nr: 5 },
            'Treppe': { nr: 6 },
        }
    },
    SPS3: {
        host: '192.168.178.235',
        port: 1003,
        motors: {
            'Bad': { nr: 2 },
            'Schlafen_Ankleide': { nr: 3 },
            'Schlafen_Osten': { nr: 4 },
        }
    }
};

// Frame-Builder Funktionen (aus motor-control.js)
function buildFrame(motorNr: number, status: number): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const opCount = 0x01;
    const opcode = 0x01;
    const valueLow = 0x48;
    // status: 0x01=hoch, 0x02=runter, 0x03=stop
    let addr;
    if (status === 0x01) {
        addr = parseInt(getStatusByte48(motorNr, 'hoch'), 16);
    } else if (status === 0x02) {
        addr = parseInt(getStatusByte48(motorNr, 'runter'), 16);
    } else if (status === 0x03) {
        addr = parseInt(getStatusByte48(motorNr, 'position_oben'), 16); // STOP mapped to position_oben for compatibility
    } else {
        throw new Error('Ungültiger Status für buildFrame');
    }
    const payload = [TYP, STATION, opCount, opcode, valueLow, addr, 0x00, 0x01];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) {
        sum += frameNoCksum[i];
    }
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function buildStopFrame(motorNr: number): Buffer {
    // STOP-Adressen aus Word-Mapping holen
    const addrStop = parseInt(getStatusWord69(motorNr, 'motor_stop'), 16);
    const addrStop2 = parseInt(getStatusWord69(motorNr, 'motor_stop2'), 16);
    // Position oben/unten weiterhin aus Byte-Mapping
    const addrOben = parseInt(getStatusByte48(motorNr, 'position_oben'), 16);
    const addrUnten = parseInt(getStatusByte48(motorNr, 'position_unten'), 16);
    const payload = [
        0x41, 0x00, 0x01, 0x04,
        0x69, addrStop, 0x00,
        0x30, 0x75, 0x69,
        addrStop2, 0x00,
        0x30, 0x75, 0x48,
        addrOben, 0x00, 0x00,
        0x48, addrUnten, 0x00, 0x00
    ];
    const STX = 0x02;
    const LEN = payload.length;
    const ETX = 0x03;
    const frameData = [STX, LEN, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameData.length - 1; i++) {
        sum += frameData[i];
    }
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameData, ckLow, ckHigh]);
}

// Status Query Frame (aus motor-control-interactive.js)
// Cache für SPS Status-Daten
const spsCache: Record<string, { timestamp: number; data: Buffer | null }> = {};
const CACHE_DURATION = 500; // 500ms Cache

// Query komplette SPS-Station (alle Motoren) - DEAKTIVIERT
function querySPSStatus(host: string, port: number): Promise<Buffer | null> {
    // Status-Abfragen deaktiviert - Status wird nur über Button-Klicks im Frontend verwaltet
    return Promise.resolve(null);
}

// Extrahiere Motor-Status aus SPS-Response
function extractMotorStatus(motorNr: number, spsResponse: Buffer | null): { status: string; position: string; raw: string } | null {
    if (!spsResponse || spsResponse.length < 30) {
        return null;
    }

    // Das 2. Paket (Daten) beginnt nach dem ACK
    // ACK ist typisch 5-6 bytes: 0203400021 oder 020440001501
    let dataPacketOffset = 5;
    if (spsResponse[5] === 0x04 && spsResponse.length > 40) {
        dataPacketOffset = 6; // 6-byte ACK
    }

    const dataPacket = spsResponse.slice(dataPacketOffset);

    // Header: 02 [LEN] 41 00 00 [COUNT]
    // Daten ab Byte 6
    const motorIndex = (motorNr - 1) * 2;
    const positionByteHigh = dataPacket[6 + motorIndex];
    const positionByteLow = dataPacket[7 + motorIndex];

    // Mapping laut Vorgabe:
    // 00 01 = runter
    // 00 00 = stop
    // 01 00 = hoch
    let position = 'unbekannt';
    if (positionByteHigh === 0x00 && positionByteLow === 0x01) {
        position = 'runter';
    } else if (positionByteHigh === 0x00 && positionByteLow === 0x00) {
        position = 'stop';
    } else if (positionByteHigh === 0x01 && positionByteLow === 0x00) {
        position = 'hoch';
    } else {
        position = `Position 0x${positionByteHigh.toString(16).toUpperCase()}${positionByteLow.toString(16).toUpperCase()}`;
    }
    // Technischen Namen aus Mapping ermitteln
    let technicalName = null;
    for (const spsKey of Object.keys(spsMapping)) {
        const motors = spsMapping[spsKey]?.motors || {};
        for (const [name, info] of Object.entries(motors)) {
            if (info.nr === motorNr) {
                technicalName = name;
                break;
            }
        }
        if (technicalName) break;
    }
    const now = new Date();
    const timestamp = now.toISOString();
    console.log(`[extractMotorStatus] ${timestamp} | MotorNr: ${motorNr} | Name: ${technicalName || '-'} | Bytes: ${positionByteHigh.toString(16).padStart(2, '0')} ${positionByteLow.toString(16).padStart(2, '0')} | Status: ${position}`);
    return {
        status: position, // <-- Stelle sicher, dass das Feld 'status' das Mapping-Ergebnis enthält
        position,
        raw: spsResponse.toString('hex')
    };
}

// Query einzelner Motor (nutzt SPS-Cache)
function queryMotorStatus(motorNr: number, host: string, port: number): Promise<{ status: string; position: string; raw: string } | null> {
    return querySPSStatus(host, port).then(spsResponse => {
        return extractMotorStatus(motorNr, spsResponse);
    });
}

// Hilfsfunktion: Einzelnen Frame senden
function sendFrame(frame: Buffer, host: string, port: number, label?: string): Promise<boolean> {
    return new Promise((resolve) => {
        let resolved = false;
        const done = (val: boolean) => { if (!resolved) { resolved = true; resolve(val); } };

        const socket = net.createConnection({ host, port });
        let responseReceived = false;

        // Connection timeout: falls SPS nicht antwortet (wichtig für Ubuntu/Linux)
        const connTimeout = setTimeout(() => {
            console.error(`SPS connection timeout: ${host}:${port}`);
            socket.destroy();
            done(false);
        }, 2000);

        socket.on('connect', () => {
            clearTimeout(connTimeout);
            const tag = label ? `${label} → ${host}:${port}` : `SPS ${host}:${port}`;
            logTelegram('SEND', tag, frame.toString('hex'));
            socket.write(frame);
            setTimeout(() => socket.destroy(), 600);
        });

        socket.on('data', (data) => {
            responseReceived = true;
            const tag = label ? `${label} → ${host}:${port}` : `SPS ${host}:${port}`;
            logTelegram('RECV', tag, data.toString('hex'));
        });

        socket.on('error', (err) => {
            clearTimeout(connTimeout);
            console.error('SPS connection error:', err.message);
            done(false);
        });

        socket.on('close', () => {
            clearTimeout(connTimeout);
            done(responseReceived);
        });
    });
}

// Sende Befehl an SPS
function sendCommandToSPS(host: string, port: number, frame: Buffer, label?: string): Promise<boolean> {
    return sendFrame(frame, host, port, label);
}

// Hilfsfunktion: Antipp-Frame für Lamellen-Steuerung (nutzt SPS Antippzeit-Register)
// WICHTIG: Das ist die RICHTIGE Methode für Teilbewegungen - nicht HOCH→STOP!
function buildAntippFrame(motorNr: number, direction: 'up' | 'down'): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const opCount = 0x01;
    const opcode = 0x01;
    const valueLow = 0x48;

    // Antipp-Status-Bytes: 0x03 = hoch antippen, 0x04 = runter antippen
    const statusByte = (motorNr - 1) * 0x10 + (direction === 'up' ? 0x03 : 0x04);

    const payload = [TYP, STATION, opCount, opcode, valueLow, statusByte, 0x00, 0x01];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];

    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) {
        sum += frameNoCksum[i];
    }

    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;

    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// API Routes
app.post('/api/motor/control', async (req: Request, res: Response) => {
    try {
        const { motor, action, sps: spsHost, port } = req.body;

        console.log(`Received command: ${motor} - ${action}`);

        // Aktualisiere Status im globalen Store
        const statusIcons: Record<string, string> = {
            'hoch': '△',
            'runter': '▽',
            'stop': '□',
            'lamellen_oeffnen': '☀️',
            'lamellen_schliessen': '🌑'
        };
        if (statusIcons[action]) {
            motorStatus[motor] = statusIcons[action];
            console.log(`📊 Status aktualisiert: ${motor} → ${statusIcons[action]}`);
        }

        // Finde SPS und Motor
        let foundSPS: string | null = null;
        let motorNr: number | null = null;

        for (const [spsName, spsData] of Object.entries(spsMapping)) {
            if (spsData.motors[motor]) {
                foundSPS = spsName;
                motorNr = spsData.motors[motor].nr;
                break;
            }
        }



        if (!foundSPS || motorNr === null) {
            return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
        }

        const spsData = spsMapping[foundSPS];

        // LAMELLEN ÖFFNEN: Sequenz HOCH → STOP (Sofort)
        if (action === 'lamellen_oeffnen') {
            console.log(`🔄 ${motor}: Lamellen öffnen - Sequenz HOCH → STOP`);

            // 1. HOCH
            const frameHoch = buildFrame(motorNr, 0x01);
            const resp1 = await sendFrame(frameHoch, spsData.host, spsData.port, `Motor ${motor}`);
            if (!resp1) {
                return res.json({ success: false, message: 'Keine Antwort bei HOCH' });
            }

            // 2. STOP
            const frameStop = buildStopFrame(motorNr);
            await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor}`);

            console.log(`✓ ${motor}: Lamellen geöffnet`);
            return res.json({ success: true, message: 'Lamellen geöffnet' });
        }

        // LAMELLEN SCHLIEẞEN: Sequenz RUNTER → STOP (Sofort)
        if (action === 'lamellen_schliessen') {
            console.log(`🔄 ${motor}: Lamellen schließen - Sequenz RUNTER → STOP`);

            // 1. RUNTER
            const frameRunter = buildFrame(motorNr, 0x02);
            const resp1 = await sendFrame(frameRunter, spsData.host, spsData.port, `Motor ${motor}`);
            if (!resp1) {
                return res.json({ success: false, message: 'Keine Antwort bei RUNTER' });
            }

            // 2. STOP
            const frameStop = buildStopFrame(motorNr);
            await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor}`);

            console.log(`✓ ${motor}: Lamellen geschlossen`);
            return res.json({ success: true, message: 'Lamellen geschlossen' });
        }

        // Normale Befehle: HOCH, RUNTER, STOP
        let frame: Buffer;
        if (action === 'hoch') {
            frame = buildFrame(motorNr, 0x01);
        } else if (action === 'runter') {
            frame = buildFrame(motorNr, 0x02);
        } else if (action === 'stop') {
            frame = buildStopFrame(motorNr);
        } else {
            return res.status(400).json({ success: false, message: 'Ungültige Aktion' });
        }

        // Sende an SPS
        const success = await sendCommandToSPS(spsData.host, spsData.port, frame, `Motor ${motor}`);

        if (success) {
            console.log(`✓ ${motor}: ${action} erfolgreich`);
            res.json({ success: true, message: 'Befehl erfolgreich gesendet', motorStatus });
        } else {
            console.log(`✗ ${motor}: ${action} fehlgeschlagen`);
            res.json({ success: false, message: 'Keine Antwort von SPS' });
        }

    } catch (error) {
        console.error('Error processing motor command:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// API: Stufenweises Lamellen-Öffnen/Schließen (mit Prozent)
app.post('/api/motor/lamellen-stufe', async (req: Request, res: Response) => {
    try {
        const { motor, direction, ms } = req.body; // direction: 'up' oder 'down', ms: direkte Wartezeit in Millisekunden

        if (!motor || !direction || ms === undefined) {
            return res.status(400).json({ success: false, message: 'motor, direction und ms erforderlich' });
        }

        console.log(`🔄 Lamellen-Stufe: ${motor} ${direction} ${ms}ms`);

        // Finde SPS und Motor (mit technischem Namen)
        let foundSPS: string | null = null;
        let motorNr: number | null = null;

        for (const [spsName, spsData] of Object.entries(spsMapping)) {
            if (spsData.motors[motor]) {
                foundSPS = spsName;
                motorNr = spsData.motors[motor].nr;
                break;
            }
        }



        if (!foundSPS || motorNr === null) {
            console.error(`❌ Motor nicht gefunden: ${motor}`);
            return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
        }

        const spsData = spsMapping[foundSPS];
        console.log(`✓ Motor gefunden: ${motor} → SPS: ${foundSPS}, Motor-Nr: ${motorNr}`);

        const wartezeit = Math.round(ms);
        console.log(`⏱️ Wartezeit: ${wartezeit}ms`);

        // 1. Sende HOCH oder RUNTER
        const frame = direction === 'up' ? buildFrame(motorNr, 0x01) : buildFrame(motorNr, 0x02);
        const resp1 = await sendFrame(frame, spsData.host, spsData.port, `Motor ${motor} ${direction}`);
        if (!resp1) {
            console.error(`❌ Keine Antwort bei Bewegungsbefehl für ${motor}`);
            return res.json({ success: false, message: 'Keine Antwort bei Bewegungsbefehl' });
        }

        console.log(`⏱️ Warte ${wartezeit}ms...`);

        // 2. Warte die berechnete Zeit
        await new Promise(resolve => setTimeout(resolve, wartezeit));

        console.log(`⏱️ Wartezeit vorbei, sende STOP`);

        // 3. Sende STOP
        const frameStop = buildStopFrame(motorNr);
        await sendFrame(frameStop, spsData.host, spsData.port, `Motor ${motor} STOP`);

        console.log(`✓ ${motor}: Lamellen ${direction} ${wartezeit}ms abgeschlossen`);

        // Aktualisiere Status
        motorStatus[motor] = direction === 'up' ? '◐' : '◑';

        return res.json({ success: true, message: `Lamellen ${direction === 'up' ? 'geöffnet' : 'geschlossen'} (${wartezeit}ms)` });

    } catch (error) {
        console.error('Error processing lamellen-stufe:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Motor-Laufzeiten/Wendezeit/Antippzeiten lesen
app.get('/api/motor/times', async (req: Request, res: Response) => {
    const motorParam = req.query.motor as string | undefined;
    if (!motorParam) return res.status(400).json({ success: false, message: 'motor erforderlich' });

    const motorObj = motorConfig.motors.find((m: any) => m.technicalName === motorParam);
    if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });

    const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
    if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });

    let motorNr: number | undefined = undefined;
    if (sps && motorObj.technicalName) {
        motorNr = sps.motors[motorObj.technicalName]?.nr;
    }
    if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });

    try {
        const values = await readMotorTimes(sps.host, sps.port, motorNr);
        if (!values) return res.json({ success: false, message: 'Keine Antwort von SPS' });
        return res.json({ success: true, data: values });
    } catch (e) {
        console.error('❌ Fehler beim Lesen der Motor-Zeiten:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});

// Motor-Laufzeiten/Wendezeit/Antippzeiten schreiben
app.post('/api/motor/times', async (req: Request, res: Response) => {
    const { motor, laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit } = req.body || {};
    if (!motor) return res.status(400).json({ success: false, message: 'motor erforderlich' });

    const motorObj = motorConfig.motors.find((m: any) => m.technicalName === motor);
    if (!motorObj) return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });

    const sps = motorObj.sps ? spsMapping[motorObj.sps] : undefined;
    if (!sps) return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });

    let motorNr: number | undefined = undefined;
    if (sps && motorObj.technicalName) {
        motorNr = sps.motors[motorObj.technicalName]?.nr;
    }
    if (motorNr === undefined) return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });

    const payload = { laufzeitHoch, laufzeitRunter, antipzeitHoch, antipzeitRunter, wendezeit };

    try {
        const ok = await writeMotorTimes(sps.host, sps.port, motorNr, payload);
        if (!ok) return res.json({ success: false, message: 'Keine Antwort von SPS' });

        // Nach erfolgreichem Schreiben zur Kontrolle erneut lesen
        const verify = await readMotorTimes(sps.host, sps.port, motorNr);
        return res.json({ success: true, data: verify || null });
    } catch (e) {
        console.error('❌ Fehler beim Schreiben der Motor-Zeiten:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});

// Motor-Konfiguration API Endpoint
app.get('/api/motors/config', (req: Request, res: Response) => {
    res.json(motorConfig);
});

// Motor-Name aktualisieren
app.post('/api/motors/update-name', (req: Request, res: Response) => {
    try {
        const { technicalName, displayName } = req.body;

        // Finde Motor in Config
        const motor = motorConfig.motors.find((m: any) => m.technicalName === technicalName);
        if (!motor) {
            return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
        }

        // Aktualisiere displayName
        motor.displayName = displayName;

        // Speichere in Datei
        fs.writeFileSync(motorConfigPath, JSON.stringify(motorConfig, null, 2), 'utf-8');

        console.log(`📝 Motor-Name aktualisiert: ${technicalName} → "${displayName}"`);
        res.json({ success: true, message: 'Name erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Motor-Namens:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Status Query Endpoint - Gibt aktuellen Status aller Motoren zurück
app.get('/api/motors/status', async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            motorStatus
        });
    } catch (error) {
        console.error('Error querying motor status:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Raum-Icons API Endpoints

// Liefert die gesamte Raumkonfiguration inkl. Reihenfolge
app.get('/api/rooms/config', (req: Request, res: Response) => {
    res.json(roomConfig);
});

// Liefert nur die Reihenfolge der Räume
app.get('/api/rooms/order', (req: Request, res: Response) => {
    res.json({ order: roomConfig.order || [] });
});

// Setzt die Reihenfolge der Räume
app.post('/api/rooms/order', express.json(), (req: Request, res: Response) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
        }
        roomConfig.order = order;
        fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
        console.log('🗂️ Raum-Reihenfolge gespeichert:', order);
        res.json({ success: true });
    } catch (error) {
        console.error('Fehler beim Speichern der Raum-Reihenfolge:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

app.post('/api/rooms/update-icon', (req: Request, res: Response) => {
    try {
        const { roomName, icon } = req.body;

        if (!roomName || !icon) {
            return res.status(400).json({ success: false, message: 'roomName und icon sind erforderlich' });
        }

        // Aktualisiere Icon
        if (!roomConfig.rooms) {
            roomConfig.rooms = {};
        }
        roomConfig.rooms[roomName] = { icon };
        // Füge neuen Raum ggf. ans Ende der Reihenfolge an
        if (roomConfig.order && !roomConfig.order.includes(roomName)) {
            roomConfig.order.push(roomName);
        }
        // Speichere in Datei
        fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
        console.log(`🏠 Raum-Icon aktualisiert: ${roomName} → ${icon}`);
        res.json({ success: true, message: 'Icon erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Raum-Icons:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Gruppen API Endpoints

// Liefert die gesamte Gruppenkonfiguration inkl. Reihenfolge
app.get('/api/groups/config', (req: Request, res: Response) => {
    res.json(groupsConfig);
});

// Liefert nur die Reihenfolge der Gruppen
app.get('/api/groups/order', (req: Request, res: Response) => {
    res.json({ order: groupsConfig.order || [] });
});


// Gruppensteuerung: Sende Befehl an alle Motoren einer Gruppe mit 50ms Pause
app.post('/api/groups/control', async (req: Request, res: Response) => {
    try {
        const { groupName, action } = req.body;
        if (!groupName || !action) {
            return res.status(400).json({ success: false, message: 'groupName und action erforderlich' });
        }
        const motors = groupsConfig.groups[groupName];
        if (!motors || !Array.isArray(motors) || motors.length === 0) {
            return res.status(404).json({ success: false, message: 'Gruppe nicht gefunden oder leer' });
        }
        let results: Record<string, any> = {};
        for (const motor of motors) {
            const technicalMotor = resolveTechnicalMotorName(motor);
            // Finde SPS und MotorNr
            let foundSPS: string | null = null;
            let motorNr: number | null = null;
            for (const [spsName, spsData] of Object.entries(spsMapping)) {
                if (spsData.motors[technicalMotor]) {
                    foundSPS = spsName;
                    motorNr = spsData.motors[technicalMotor].nr;
                    break;
                }
            }
            if (!foundSPS || motorNr === null) {
                results[motor] = { success: false, message: 'Motor nicht gefunden' };
                continue;
            }
            const spsData = spsMapping[foundSPS];
            let frame: Buffer;
            if (action === 'hoch') {
                frame = buildFrame(motorNr, 0x01);
            } else if (action === 'runter') {
                frame = buildFrame(motorNr, 0x02);
            } else if (action === 'stop') {
                frame = buildStopFrame(motorNr);
            } else {
                results[motor] = { success: false, message: 'Ungültige Aktion' };
                continue;
            }
            const success = await sendCommandToSPS(spsData.host, spsData.port, frame, `Motor ${technicalMotor}`);
            results[motor] = { success, message: success ? 'Befehl gesendet' : 'Keine Antwort von SPS' };
            // 200ms Pause zwischen den Motoren (erhöht von 50ms für Ubuntu/Linux-Kompatibilität)
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return res.json({ success: true, results });
    } catch (error) {
        console.error('Fehler bei Gruppensteuerung:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});


// Setzt die Reihenfolge der Gruppen
app.post('/api/groups/order', express.json(), (req: Request, res: Response) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
        }
        groupsConfig.order = order;
        fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
        console.log('🗂️ Gruppen-Reihenfolge gespeichert:', order);
        res.json({ success: true });
    } catch (error) {
        console.error('Fehler beim Speichern der Gruppen-Reihenfolge:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Erstellt oder aktualisiert eine Gruppe
app.post('/api/groups/update', express.json(), (req: Request, res: Response) => {
    try {
        const { groupName, windows } = req.body;

        if (!groupName || !Array.isArray(windows)) {
            return res.status(400).json({ success: false, message: 'groupName und windows (Array) sind erforderlich' });
        }

        // Aktualisiere Gruppe
        groupsConfig.groups[groupName] = windows;
        // Füge neue Gruppe ggf. ans Ende der Reihenfolge an
        if (groupsConfig.order && !groupsConfig.order.includes(groupName)) {
            groupsConfig.order.push(groupName);
        }
        // Speichere in Datei
        fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
        console.log(`👥 Gruppe aktualisiert: ${groupName} → ${windows.join(', ')}`);
        res.json({ success: true, message: 'Gruppe erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Gruppe:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// Löscht eine Gruppe
app.delete('/api/groups/:groupName', (req: Request, res: Response) => {
    try {
        const { groupName } = req.params;

        if (!groupsConfig.groups[groupName]) {
            return res.status(404).json({ success: false, message: 'Gruppe nicht gefunden' });
        }

        delete groupsConfig.groups[groupName];
        // Entferne aus Reihenfolge
        if (groupsConfig.order) {
            groupsConfig.order = groupsConfig.order.filter(g => g !== groupName);
        }
        // Speichere in Datei
        fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
        console.log(`🗑️ Gruppe gelöscht: ${groupName}`);
        res.json({ success: true, message: 'Gruppe erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen der Gruppe:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});

// SPS-Automatiken API Endpoints

// Hilfsfunktion: Build SPS-Automatik Frame (14 bytes)
function buildSPSAutomatikFrame(address: number, value: number): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const payload = [TYP, 0x00, 0x01, 0x01, 0x69, address, 0x00, value, 0x00];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];

    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;

    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Build Zeitsynchronisations-Frame (16 bytes)
function buildTimeSyncFrame(date?: Date): Buffer {
    const now = date || new Date();
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const OPCODE = 0x21; // Zeitsynchronisation

    const year = now.getFullYear();
    const yearLow = year & 0xFF;
    const yearHigh = (year >> 8) & 0xFF;
    const month = now.getMonth() + 1; // 0-11 → 1-12
    const day = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();

    const payload = [TYP, 0x00, OPCODE, yearLow, yearHigh, month, day, hour, minute, second, 0x00];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];

    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;

    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Build SPS-Automatik Query Frame (liest 4 Adressen: 0x61, 0x62, 0x63, 0x64)
function buildSPSAutomatikQueryFrame(): Buffer {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const payload = [TYP, 0x00, 0x00, 0x04, 0x69, 0x61, 0x00, 0x69, 0x62, 0x00, 0x69, 0x63, 0x00, 0x69, 0x64, 0x00];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];

    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++) sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;

    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

// Hilfsfunktion: Parse SPS-Automatik Response (4 Word-Werte)
function parseSPSAutomatikResponse(buffer: Buffer) {
    if (!buffer || buffer.length < 20) return null;

    // Skip ACK frame if present
    let dataFrame = buffer;
    if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
        dataFrame = buffer.slice(5);
    }

    // Response structure: 02 [LEN] 41 00 00 04 [val1_low val1_high] [val2_low val2_high] [val3_low val3_high] [val4_low val4_high] 03 [CK]
    // Values start at byte 6
    const zeitautomatikB10 = dataFrame[6] | (dataFrame[7] << 8); // 0x61: 0=AUS, 1=AN, 2=Zufallsautomatik
    const beschattung = (dataFrame[8] | (dataFrame[9] << 8)) === 0x01; // 0x62: 1=AN, 0=AUS
    const daemmerung = (dataFrame[10] | (dataFrame[11] << 8)) === 0x01; // 0x63: 1=AN, 0=AUS
    const zeitautomatikB16 = (dataFrame[12] | (dataFrame[13] << 8)) === 0x01; // 0x64: 1=AN, 0=AUS

    return { zeitautomatikB10, beschattung, daemmerung, zeitautomatikB16 };
}

// GET /api/sps/automatiken/:spsName - Liest alle Automatiken einer SPS
app.get('/api/sps/automatiken/:spsName', async (req: Request, res: Response) => {
    console.log('📊 GET /api/sps/automatiken/:spsName aufgerufen');
    const { spsName } = req.params;

    const sps = spsMapping[spsName];
    if (!sps) {
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    }

    try {
        const frame = buildSPSAutomatikQueryFrame();
        console.log('📤 Query Frame:', frame.toString('hex'));

        const response = await new Promise<Buffer | null>((resolve) => {
            const socket = net.createConnection({ host: sps.host, port: sps.port });
            let responseBuffer = Buffer.alloc(0);
            let timeoutHandle: NodeJS.Timeout;

            socket.on('connect', () => {
                console.log(`✅ Verbunden mit ${sps.host}:${sps.port}`);
                socket.write(frame);
            });

            socket.on('data', (data) => {
                const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
                responseBuffer = Buffer.concat([responseBuffer, chunk]);
                console.log(`📥 Automatiken Response chunk ${sps.host}:${sps.port}:`, chunk.toString('hex'));
            });

            socket.on('error', (err) => {
                console.error('❌ Socket Error:', err.message);
                clearTimeout(timeoutHandle);
                resolve(null);
            });

            socket.on('close', () => {
                clearTimeout(timeoutHandle);
                console.log(`🔌 Socket geschlossen, empfangen: ${responseBuffer.length} bytes`);
                resolve(responseBuffer.length > 0 ? responseBuffer : null);
            });

            timeoutHandle = setTimeout(() => {
                console.log('⏱️ Timeout nach 250ms');
                socket.destroy();
                resolve(responseBuffer.length > 0 ? responseBuffer : null);
            }, 250);
        });

        if (response) {
            console.log(`📥 Complete Response ${sps.host}:${sps.port}:`, response.toString('hex'));
            const parsed = parseSPSAutomatikResponse(response);
            if (parsed) {
                console.log('✅ Parsed Automatiken:', parsed);
                return res.json({ success: true, data: parsed });
            }
        }

        return res.json({ success: false, message: 'Keine Antwort von SPS' });
    } catch (e) {
        console.error('❌ Fehler bei Automatiken-Query:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Query' });
    }
});

// POST /api/sps/automatiken/toggle - Schaltet eine Automatik
app.post('/api/sps/automatiken/toggle', async (req: Request, res: Response) => {
    console.log('🔄 POST /api/sps/automatiken/toggle aufgerufen');
    const { spsName, type, value } = req.body;

    if (!spsName || !type || value === undefined) {
        return res.status(400).json({ success: false, message: 'spsName, type und value erforderlich' });
    }

    const sps = spsMapping[spsName];
    if (!sps) {
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    }

    // Adress-Mapping
    const addressMap: Record<string, number> = {
        zeitautomatikB10: 0x61,
        beschattung: 0x62,
        daemmerung: 0x63,
        zeitautomatikB16: 0x64
    };

    const address = addressMap[type];
    if (!address) {
        return res.status(400).json({ success: false, message: 'Ungültiger Automatik-Typ' });
    }

    // Wert-Konvertierung
    let byteValue: number;
    if (type === 'zeitautomatikB10') {
        byteValue = typeof value === 'number' ? value : (value ? 1 : 0); // 0=AUS, 1=AN, 2=Zufallsautomatik
    } else {
        byteValue = value ? 0x01 : 0x00; // Beschattung/Dämmerung/B16: 1=AN, 0=AUS
    }

    try {
        const frame = buildSPSAutomatikFrame(address, byteValue);
        console.log(`📤 Toggle ${type} → ${byteValue}:`, frame.toString('hex'));

        const success = await new Promise<boolean>((resolve) => {
            const socket = net.createConnection({ host: sps.host, port: sps.port });
            let responseReceived = false;
            let timeoutHandle: NodeJS.Timeout;

            socket.on('connect', () => {
                console.log(`✅ Verbunden mit ${sps.host}:${sps.port}`);
                socket.write(frame);
            });

            socket.on('data', (data) => {
                responseReceived = true;
                console.log('📥 SPS-Antwort:', data.toString('hex'));
            });

            socket.on('error', (err) => {
                console.error('❌ Socket Error:', err.message);
                clearTimeout(timeoutHandle);
                resolve(false);
            });

            socket.on('close', () => {
                clearTimeout(timeoutHandle);
                console.log(`🔌 Socket geschlossen, Response: ${responseReceived ? 'JA' : 'NEIN'}`);
                resolve(responseReceived);
            });

            timeoutHandle = setTimeout(() => {
                console.log('⏱️ Timeout nach 250ms');
                socket.destroy();
                resolve(responseReceived);
            }, 250);
        });

        if (success) {
            console.log(`✅ ${type} erfolgreich geschaltet`);
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: 'Keine Antwort von SPS' });
        }
    } catch (e) {
        console.error('❌ Fehler beim Schalten:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});

// GET /api/sps/sync-time - Sendet aktuelle Zeit an alle SPSsen
app.get('/api/sps/sync-time', async (req: Request, res: Response) => {
    console.log('🕐 GET /api/sps/sync-time aufgerufen');

    try {
        const now = new Date();
        const frame = buildTimeSyncFrame(now);
        const timeStr = now.toLocaleString('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        console.log(`📤 Zeitsynchronisation Frame: ${frame.toString('hex')}`);
        console.log(`📅 Zeit: ${timeStr}`);

        const results: Record<string, { success: boolean; message?: string }> = {};

        // Sende an alle SPSsen
        for (const [spsName, spsData] of Object.entries(spsMapping)) {
            console.log(`📡 Sende an ${spsName} (${spsData.host}:${spsData.port})...`);

            const success = await new Promise<boolean>((resolve) => {
                const socket = net.createConnection({ host: spsData.host, port: spsData.port });
                let responseReceived = false;
                let timeoutHandle: NodeJS.Timeout;

                socket.on('connect', () => {
                    console.log(`✅ Verbunden mit ${spsName}`);
                    socket.write(frame);
                });

                socket.on('data', (data) => {
                    responseReceived = true;
                    console.log(`📥 ${spsName} Antwort:`, data.toString('hex'));
                });

                socket.on('error', (err) => {
                    console.error(`❌ ${spsName} Error:`, err.message);
                    clearTimeout(timeoutHandle);
                    resolve(false);
                });

                socket.on('close', () => {
                    clearTimeout(timeoutHandle);
                    console.log(`🔌 ${spsName} Socket geschlossen, Response: ${responseReceived ? 'JA' : 'NEIN'}`);
                    resolve(responseReceived);
                });

                timeoutHandle = setTimeout(() => {
                    console.log(`⏱️ ${spsName} Timeout nach 250ms`);
                    socket.destroy();
                    resolve(responseReceived);
                }, 250);
            });

            results[spsName] = {
                success,
                message: success ? 'Zeit synchronisiert' : 'Keine Antwort'
            };
        }

        const allSuccess = Object.values(results).every(r => r.success);
        const successCount = Object.values(results).filter(r => r.success).length;

        console.log(`✅ Zeitsynchronisation abgeschlossen: ${successCount}/${Object.keys(spsMapping).length} SPSsen erfolgreich`);

        return res.json({
            success: allSuccess,
            time: timeStr,
            results
        });
    } catch (e) {
        console.error('❌ Fehler bei Zeitsynchronisation:', e);
        return res.status(500).json({ success: false, message: 'Fehler bei Zeitsynchronisation' });
    }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Zeitsynchronisation an alle SPS senden
async function syncTimeToAllSPS() {
    const now = new Date();
    const frame = buildTimeSyncFrame(now);
    const timeStr = now.toLocaleString('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log(`🕐 Zeitsynchronisation → SPS (${timeStr}): ${frame.toString('hex')}`);

    for (const [spsName, spsData] of Object.entries(spsMapping)) {
        await new Promise<void>((resolve) => {
            const socket = net.createConnection({ host: spsData.host, port: spsData.port });
            let timeoutHandle: NodeJS.Timeout;
            socket.on('connect', () => { socket.write(frame); });
            socket.on('data', (data) => { console.log(`✅ ${spsName} Zeit-Sync ACK: ${data.toString('hex')}`); });
            socket.on('error', (err) => { console.warn(`⚠️ ${spsName} Zeit-Sync Fehler: ${err.message}`); clearTimeout(timeoutHandle); resolve(); });
            socket.on('close', () => { clearTimeout(timeoutHandle); resolve(); });
            timeoutHandle = setTimeout(() => { socket.destroy(); resolve(); }, 500);
        });
    }
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor Control Backend läuft auf http://0.0.0.0:${PORT}`);
    console.log(`📡 Verbindungen zu 3 SPS-Stationen konfiguriert`);
    console.log(`🌐 Netzwerk-Zugriff: http://192.168.178.93:${PORT}`);

    // Zeitsynchronisation beim Start (nach 2 Sekunden)
    setTimeout(() => syncTimeToAllSPS(), 2000);

    // Stündliche Zeitsynchronisation
    setInterval(() => syncTimeToAllSPS(), 60 * 60 * 1000);
});

// Keep ES module process alive
setInterval(() => { }, 2147483647);

