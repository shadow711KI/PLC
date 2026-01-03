import express from 'express';
import cors from 'cors';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// ES Module: __dirname Alternative (ganz am Anfang!)
const app = express();
const PORT = 3001;
// Hilfsfunktion: Zeitautomatik-Frame für einen Motor und Zeitpunkte bauen (Platzhalter, anpassen nach Protokoll)
function buildZeitautomatikWriteFrame(motorNr, points) {
    // Build write frame matching app log: header + 6 operands
    // Each operand: 0x69 <addr> 0x00 <d0> <d1> <d2> <d3>  (3 + 4 = 7 bytes)
    // points: array of up to 6 entries with { weekdayMask, hour, minute, action }
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const OPCODE = 0x01; // write
    const COUNT = 0x06; // six operands
    // Base addresses observed in app log: 0x57 .. 0x5C
    const baseAddr = 0x57;
    const payload = [TYP, STATION, OPCODE, COUNT];
    for (let i = 0; i < 6; i++) {
        const p = points && points[i] ? points[i] : {};
        const addr = baseAddr + i;
        const weekdayMask = p.weekdayMask != null ? p.weekdayMask & 0xFF : 0x00;
        const hour = p.hour != null ? p.hour & 0xFF : 0x00;
        const minute = p.minute != null ? p.minute & 0xFF : 0x00;
        let actionCode = 0x00; // default no-op
        if (p.action === 'hoch' || p.action === 'up')
            actionCode = 0x01;
        if (p.action === 'runter' || p.action === 'down')
            actionCode = 0x02;
        // operand: op-code 0x69, addr, 0x00, then 4 data bytes
        payload.push(0x69, addr, 0x00, weekdayMask, hour, minute, actionCode);
    }
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++)
        sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}
// Hilfsfunktion: Zeitpunkte an SPS schreiben (TCP)
function writeZeitautomatikToSPS(host, port, motorNr, points) {
    return new Promise((resolve) => {
        const frame = buildZeitautomatikWriteFrame(motorNr, points);
        const sock = net.createConnection({ host, port });
        let response = Buffer.alloc(0);
        let timeoutHandle;
        sock.on('connect', () => { sock.write(frame); });
        sock.on('data', (data) => { response = Buffer.concat([response, data]); });
        sock.on('end', () => { clearTimeout(timeoutHandle); sock.destroy(); resolve(response); });
        sock.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });
        timeoutHandle = setTimeout(() => { sock.destroy(); resolve(null); }, 1500);
    });
}
// ES Module: __dirname Alternative (ganz am Anfang!)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Hilfsfunktion: Zeitautomatik-Frame für einen Motor bauen (READ)
// Nach Doku: Für Zeitautomatik sollten Zeitpunkte gelesen werden
// Verwende Frame für Schaltzeitpunkte 1-6 lesen (aus Doku 8.5)
function buildZeitautomatikReadFrame(motorNr) {
    // Frame für 6 Zeitpunkte lesen: 02 16 41 00 00 06 69 07 00 ... 03 [checksum]
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const OPCODE = 0x00; // Befehlscode
    const COUNT = 0x06; // 6 Operanden (Zeitpunkte 1-6)
    // App log shows addresses 0x57..0x5C for timepoints
    const OPERANDS = [
        0x69, 0x57, 0x00, // Zeitpunkt 1
        0x69, 0x58, 0x00, // Zeitpunkt 2
        0x69, 0x59, 0x00, // Zeitpunkt 3
        0x69, 0x5A, 0x00, // Zeitpunkt 4
        0x69, 0x5B, 0x00, // Zeitpunkt 5
        0x69, 0x5C, 0x00 // Zeitpunkt 6
    ];
    const payload = [TYP, STATION, OPCODE, COUNT, ...OPERANDS];
    const len = payload.length;
    const frameNoCksum = [STX, len, ...payload, ETX];
    let sum = 0;
    for (let i = 2; i < frameNoCksum.length - 1; i++)
        sum += frameNoCksum[i];
    const ckLow = sum & 0xFF;
    const ckHigh = (sum >> 8) & 0xFF;
    const frame = Buffer.from([...frameNoCksum, ckLow, ckHigh]);
    console.log(`🔧 Zeitautomatik Read Frame für Motor ${motorNr}:`, frame.toString('hex'));
    return frame;
}
// Hilfsfunktion: Zeitpunkte von SPS lesen (TCP)
function readZeitautomatikFromSPS(host, port, motorNr) {
    return new Promise((resolve) => {
        const frame = buildZeitautomatikReadFrame(motorNr);
        const sock = net.createConnection({ host, port });
        let response = Buffer.alloc(0);
        let timeoutHandle;
        sock.on('connect', () => { sock.write(frame); });
        sock.on('data', (data) => { response = Buffer.concat([response, data]); });
        sock.on('end', () => { clearTimeout(timeoutHandle); sock.destroy(); resolve(response); });
        sock.on('error', () => { clearTimeout(timeoutHandle); resolve(null); });
        timeoutHandle = setTimeout(() => { sock.destroy(); resolve(null); }, 1500);
    });
}
// Hilfsfunktion: Zeitpunkte aus SPS-Response parsen (nach Doku 8.5)
function parseZeitautomatikResponse(buffer) {
    // Robustere deutsche Version: Gibt immer alle Felder zurück, auch bei ungültigen Werten
    if (!buffer || buffer.length < 10) {
        console.log('⚠️  Keine gültige SPS-Antwort für Zeitautomatik erhalten');
        return [];
    }
    console.log('📡 SPS-Antwort für Zeitautomatik erhalten:', buffer.toString('hex'), 'Länge:', buffer.length);
    // Erwartete Antwort-Struktur für 6 Zeitpunkte:
    // 02 03 40 00 21 02 1C 41 00 00 06 [6×4 Datenbytes] 03 [Prüfsumme]
    // Nach STX LEN TYPE STATUS LEN TYPE STATUS COUNT folgen 24 Bytes (6×4) Daten
    // Mapping (pro Zeitpunkt):
    //   Byte 0: Wochentags-Maske (Bitfeld, 0=aus, 1=Mo, 2=Di, ...)
    //   Byte 1: Stunde (0–23)
    //   Byte 2: Minute (0–59)
    //   Byte 3: Aktion (1=hoch, 2=runter, sonst unbekannt)
    try {
        // Header suchen: [0x41,0x00,0x00,0x06]
        const headerPattern = Buffer.from([0x41, 0x00, 0x00, 0x06]);
        let patternIndex = buffer.indexOf(headerPattern);
        // Fallback: Standard-Offset
        let dataStart = patternIndex !== -1 ? patternIndex + headerPattern.length : 12;
        const timePoints = [];
        for (let i = 0; i < 6; i++) {
            const offset = dataStart + (i * 4);
            if (offset + 4 > buffer.length) {
                // Zu wenig Daten, Rest mit null auffüllen
                timePoints.push({
                    id: i + 1,
                    weekdayMask: null,
                    hour: null,
                    minute: null,
                    action: 'unbekannt',
                    enabled: false,
                    raw: [null, null, null, null],
                    info: 'Keine Daten empfangen'
                });
                continue;
            }
            const bytes = buffer.slice(offset, offset + 4);
            const weekdayMask = bytes[0];
            const b1 = bytes[1];
            const b2 = bytes[2];
            const b3 = bytes[3];
            const raw = [weekdayMask, b1, b2, b3];
            const enabled = (weekdayMask > 0);
            // Werte dekodieren, auch wenn sie außerhalb des gültigen Bereichs liegen
            let hour = (b1 >= 0 && b1 <= 23) ? b1 : null;
            let minute = (b2 >= 0 && b2 <= 59) ? b2 : null;
            let action = 'unbekannt';
            if (b3 === 1)
                action = 'hoch';
            else if (b3 === 2)
                action = 'runter';
            // Info-Feld für Debugging
            let info = '';
            if (hour === null)
                info += 'Stunde ungültig; ';
            if (minute === null)
                info += 'Minute ungültig; ';
            if (!enabled)
                info += 'Zeitpunkt deaktiviert; ';
            if (action === 'unbekannt')
                info += 'Aktion unbekannt; ';
            timePoints.push({
                id: i + 1,
                weekdayMask,
                hour,
                minute,
                action,
                enabled,
                raw,
                info: info.trim()
            });
        }
        console.log('📅 Parsierte Zeitpunkte:', timePoints);
        return timePoints;
    }
    catch (error) {
        console.error('❌ Fehler beim Parsen der Zeitautomatik-Antwort:', error);
        // Im Fehlerfall: 6 leere Zeitpunkte zurückgeben
        return Array.from({ length: 6 }, (_, i) => ({
            id: i + 1,
            weekdayMask: null,
            hour: null,
            minute: null,
            action: 'unbekannt',
            enabled: false,
            raw: [null, null, null, null],
            info: 'Parser-Fehler'
        }));
    }
}
// Zeitautomatik Speicherpfad
// Export für Testskripte
export { parseZeitautomatikResponse };
const zeitautomatikPath = path.join(__dirname, 'zeitautomatik-store.json');
let zeitautomatikData = { motors: {} };
try {
    if (fs.existsSync(zeitautomatikPath)) {
        zeitautomatikData = JSON.parse(fs.readFileSync(zeitautomatikPath, 'utf-8'));
    }
}
catch (error) {
    console.error('❌ Fehler beim Laden der Zeitautomatik-Daten:', error);
}
// API: Zeitautomatik auslesen (alle Motoren oder einen)
// API: Zeitautomatik auslesen (direkt von SPS)
app.get('/api/zeitautomatik', async (req, res) => {
    const motor = req.query.motor;
    console.log(`🔍 Zeitautomatik-API aufgerufen für Motor: ${motor}`);
    if (!motor)
        return res.status(400).json({ success: false, message: 'motor erforderlich' });
    // Motor in Config suchen
    const motorObj = motorConfig.motors.find((m) => m.name === motor || m.technicalName === motor);
    console.log(`🔍 Motor gefunden:`, motorObj ? { name: motorObj.name, technicalName: motorObj.technicalName, sps: motorObj.sps } : 'NICHT GEFUNDEN');
    if (!motorObj)
        return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    // SPS-Info holen
    const PORT = 3001;
    const sps = spsMapping[motorObj.sps];
    console.log(`🔍 SPS gefunden:`, sps ? { host: sps.host, port: sps.port } : 'NICHT GEFUNDEN');
    if (!sps)
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    const motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
    console.log(`🔍 Motor-Nr gefunden: ${motorNr} (für ${motorObj.name || motorObj.technicalName})`);
    if (!motorNr)
        return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
    // TCP-Request an SPS
    try {
        const spsResponse = await readZeitautomatikFromSPS(sps.host, sps.port, motorNr);
        console.log('--- SPS Zeitautomatik-Response ---');
        if (spsResponse) {
            console.log('HEX:', spsResponse.toString('hex'));
            console.log('Länge:', spsResponse.length);
        }
        else {
            console.log('Keine Antwort von SPS erhalten.');
        }
        const points = parseZeitautomatikResponse(spsResponse);
        return res.json({ success: true, data: points });
    }
    catch (e) {
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});
// API: Zeitautomatik speichern (ein Motor)
// API: Zeitautomatik speichern (direkt an SPS)
app.post('/api/zeitautomatik', async (req, res) => {
    const { motor, points } = req.body;
    if (!motor || !Array.isArray(points)) {
        return res.status(400).json({ success: false, message: 'motor und points erforderlich' });
    }
    // Motor in Config suchen
    const motorObj = motorConfig.motors.find((m) => m.name === motor || m.technicalName === motor);
    if (!motorObj)
        return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
    // SPS-Info holen
    const sps = spsMapping[motorObj.sps];
    if (!sps)
        return res.status(404).json({ success: false, message: 'SPS nicht gefunden' });
    const motorNr = sps.motors[motorObj.name]?.nr || sps.motors[motorObj.technicalName]?.nr;
    if (!motorNr)
        return res.status(404).json({ success: false, message: 'Motor-Nr nicht gefunden' });
    // TCP-Request an SPS
    try {
        const spsResponse = await writeZeitautomatikToSPS(sps.host, sps.port, motorNr, points);
        // Optional: Response prüfen/parsen
        // Nach erfolgreichem Schreiben auch im Backend-Store sichern
        zeitautomatikData.motors[motor] = points;
        fs.writeFileSync(zeitautomatikPath, JSON.stringify(zeitautomatikData, null, 2), 'utf-8');
        return res.json({ success: true });
    }
    catch (e) {
        return res.status(500).json({ success: false, message: 'Fehler bei SPS-Request' });
    }
});
// Lade Motor-Konfiguration
const motorConfigPath = path.join(__dirname, '..', 'motor-config.json');
let motorConfig;
try {
    const configData = fs.readFileSync(motorConfigPath, 'utf-8');
    motorConfig = JSON.parse(configData);
    console.log(`📄 Motor-Konfiguration geladen: ${motorConfig.motors.length} Motoren`);
}
catch (error) {
    console.error('❌ Fehler beim Laden der Motor-Konfiguration:', error);
    motorConfig = { motors: [] };
}
// Lade Raum-Icons Konfiguration
const roomConfigPath = path.join(__dirname, '..', 'room-config.json');
let roomConfig;
try {
    const configData = fs.readFileSync(roomConfigPath, 'utf-8');
    roomConfig = JSON.parse(configData);
    if (!roomConfig.order)
        roomConfig.order = [];
    console.log(`📄 Raum-Konfiguration geladen: ${Object.keys(roomConfig.rooms).length} Räume`);
}
catch (error) {
    console.log('📄 Erstelle neue Raum-Konfiguration');
    roomConfig = { rooms: {}, order: [] };
    fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
}
// Lade Gruppen-Konfiguration
const groupsConfigPath = path.join(__dirname, '..', 'groups-config.json');
let groupsConfig;
try {
    const configData = fs.readFileSync(groupsConfigPath, 'utf-8');
    groupsConfig = JSON.parse(configData);
    if (!groupsConfig.order)
        groupsConfig.order = [];
    console.log(`📄 Gruppen-Konfiguration geladen: ${Object.keys(groupsConfig.groups).length} Gruppen`);
}
catch (error) {
    console.log('📄 Erstelle neue Gruppen-Konfiguration');
    groupsConfig = { groups: {}, order: [] };
    fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
}
// Middleware
app.use(cors());
app.use(express.json());
// Globaler Status-Store für alle Motoren (synchronisiert zwischen allen Clients)
const motorStatus = {};
// Initialisiere Status für alle Motoren aus Config
motorConfig.motors.forEach((motor) => {
    motorStatus[motor.technicalName] = '△';
});
// SPS Adressen mapping (aus addresses.json)
const spsMapping = {
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
function buildFrame(motorNr, status) {
    const STX = 0x02, ETX = 0x03, TYP = 0x41;
    const STATION = 0x00;
    const opCount = 0x01;
    const opcode = 0x01;
    const valueLow = 0x48;
    const statusByte = (motorNr - 1) * 0x10 + status;
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
function buildStopFrame(motorNr) {
    const motorIdx = motorNr - 1;
    const b7 = (motorIdx * 0x10) + 0x0D;
    const b13 = (motorIdx * 0x10) + 0x0E;
    const b17 = (motorIdx * 0x10) + 0x03;
    const b21 = (motorIdx * 0x10) + 0x04;
    const payload = [
        0x41, 0x00, 0x01, 0x04,
        0x69, b7, 0x00,
        0x30, 0x75, 0x69,
        b13, 0x00,
        0x30, 0x75, 0x48,
        b17, 0x00, 0x00,
        0x48, b21, 0x00, 0x00
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
const spsCache = {};
const CACHE_DURATION = 500; // 500ms Cache
// Builds das komplette Status-Query Frame für eine SPS-Station (alle Motoren)
function buildSPSStatusQueryFrame(spsPort) {
    // Basierend auf Session #9 Format
    if (spsPort === 1001) {
        // SPS1: 6 Motoren (Wohnen-Bereich + Arbeiten)
        const hexString = '02434100001548030048040048130048140048230048240048330048340048430048440048530048540069060069160069260069360069460069560048100048200048300003820A';
        return Buffer.from(hexString, 'hex');
    }
    else if (spsPort === 1002) {
        // SPS2: 6 Motoren (Anna, Fitness, Frida, Treppe, Schlafen_Sued)
        // Ähnliches Format wie SPS1, aber mit Adressen für Motoren 1-6 auf Port 1002
        const hexString = '02434100001548010048020048110048120048210048220048310048320048410048420048510048520069010069110069210069310069410069510048100048200048300003810A';
        return Buffer.from(hexString, 'hex');
    }
    else if (spsPort === 1003) {
        // SPS3: 3 Motoren (Bad, Schlafen_Ankleide, Schlafen_Osten) - Motoren 2,3,4
        const hexString = '021F4100000D481200481300481400691200691300691400481000482000483000034D03';
        return Buffer.from(hexString, 'hex');
    }
    // Fallback
    return Buffer.from('02434100000003', 'hex');
}
// Query komplette SPS-Station (alle Motoren) - DEAKTIVIERT
function querySPSStatus(host, port) {
    // Status-Abfragen deaktiviert - Status wird nur über Button-Klicks im Frontend verwaltet
    return Promise.resolve(null);
}
// Extrahiere Motor-Status aus SPS-Response
function extractMotorStatus(motorNr, spsResponse) {
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
    // Position dekodieren (beide Bytes einzeln prüfen wie in motor-control-interactive.js)
    let position = 'Unbekannt';
    if (positionByteHigh === 0x00 && positionByteLow === 0x00) {
        position = 'Oben';
    }
    else if (positionByteHigh === 0x00 && positionByteLow === 0x01) {
        position = 'Unten';
    }
    else if (positionByteHigh === 0x01 && positionByteLow === 0x00) {
        position = 'Oben';
    }
    else {
        position = `Position 0x${positionByteHigh.toString(16).toUpperCase()}${positionByteLow.toString(16).toUpperCase()}`;
    }
    return {
        status: 'OK',
        position,
        raw: spsResponse.toString('hex')
    };
}
// Query einzelner Motor (nutzt SPS-Cache)
function queryMotorStatus(motorNr, host, port) {
    return querySPSStatus(host, port).then(spsResponse => {
        return extractMotorStatus(motorNr, spsResponse);
    });
}
// Hilfsfunktion: Einzelnen Frame senden
function sendFrame(frame, host, port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host, port });
        let responseReceived = false;
        socket.on('connect', () => {
            socket.write(frame);
            setTimeout(() => socket.destroy(), 1000);
        });
        socket.on('data', () => {
            responseReceived = true;
        });
        socket.on('error', (err) => {
            console.error('SPS connection error:', err.message);
            resolve(false);
        });
        socket.on('close', () => {
            resolve(responseReceived);
        });
    });
}
// Sende Befehl an SPS
function sendCommandToSPS(host, port, frame) {
    return sendFrame(frame, host, port);
}
// API Routes
app.post('/api/motor/control', async (req, res) => {
    try {
        const { motor, action, sps: spsHost, port } = req.body;
        console.log(`Received command: ${motor} - ${action}`);
        // Aktualisiere Status im globalen Store
        const statusIcons = {
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
        let foundSPS = null;
        let motorNr = null;
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
        // LAMELLEN ÖFFNEN: Sequenz HOCH → STOP
        if (action === 'lamellen_oeffnen') {
            console.log(`🔄 ${motor}: Lamellen öffnen - Sequenz HOCH → STOP`);
            // 1. HOCH
            const frameHoch = buildFrame(motorNr, 0x01);
            const resp1 = await sendFrame(frameHoch, spsData.host, spsData.port);
            if (!resp1) {
                return res.json({ success: false, message: 'Keine Antwort bei HOCH' });
            }
            // 2. STOP
            const frameStop = buildStopFrame(motorNr);
            await sendFrame(frameStop, spsData.host, spsData.port);
            console.log(`✓ ${motor}: Lamellen geöffnet`);
            return res.json({ success: true, message: 'Lamellen geöffnet' });
        }
        // LAMELLEN SCHLIEẞEN: Sequenz RUNTER → STOP
        if (action === 'lamellen_schliessen') {
            console.log(`🔄 ${motor}: Lamellen schließen - Sequenz RUNTER → STOP`);
            // 1. RUNTER
            const frameRunter = buildFrame(motorNr, 0x02);
            const resp1 = await sendFrame(frameRunter, spsData.host, spsData.port);
            if (!resp1) {
                return res.json({ success: false, message: 'Keine Antwort bei RUNTER' });
            }
            // 2. STOP
            const frameStop = buildStopFrame(motorNr);
            await sendFrame(frameStop, spsData.host, spsData.port);
            console.log(`✓ ${motor}: Lamellen geschlossen`);
            return res.json({ success: true, message: 'Lamellen geschlossen' });
        }
        // Normale Befehle: HOCH, RUNTER, STOP
        let frame;
        if (action === 'hoch') {
            frame = buildFrame(motorNr, 0x01);
        }
        else if (action === 'runter') {
            frame = buildFrame(motorNr, 0x02);
        }
        else if (action === 'stop') {
            frame = buildStopFrame(motorNr);
        }
        else {
            return res.status(400).json({ success: false, message: 'Ungültige Aktion' });
        }
        // Sende an SPS
        const success = await sendCommandToSPS(spsData.host, spsData.port, frame);
        if (success) {
            console.log(`✓ ${motor}: ${action} erfolgreich`);
            res.json({ success: true, message: 'Befehl erfolgreich gesendet', motorStatus });
        }
        else {
            console.log(`✗ ${motor}: ${action} fehlgeschlagen`);
            res.json({ success: false, message: 'Keine Antwort von SPS' });
        }
    }
    catch (error) {
        console.error('Error processing motor command:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Motor-Konfiguration API Endpoint
app.get('/api/motors/config', (req, res) => {
    res.json(motorConfig);
});
// Motor-Name aktualisieren
app.post('/api/motors/update-name', (req, res) => {
    try {
        const { technicalName, displayName } = req.body;
        // Finde Motor in Config
        const motor = motorConfig.motors.find((m) => m.technicalName === technicalName);
        if (!motor) {
            return res.status(404).json({ success: false, message: 'Motor nicht gefunden' });
        }
        // Aktualisiere displayName
        motor.displayName = displayName;
        // Speichere in Datei
        fs.writeFileSync(motorConfigPath, JSON.stringify(motorConfig, null, 2), 'utf-8');
        console.log(`📝 Motor-Name aktualisiert: ${technicalName} → "${displayName}"`);
        res.json({ success: true, message: 'Name erfolgreich aktualisiert' });
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Motor-Namens:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Status Query Endpoint - Gibt aktuellen Status aller Motoren zurück
app.get('/api/motors/status', async (req, res) => {
    try {
        res.json({
            success: true,
            motorStatus
        });
    }
    catch (error) {
        console.error('Error querying motor status:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Raum-Icons API Endpoints
// Liefert die gesamte Raumkonfiguration inkl. Reihenfolge
app.get('/api/rooms/config', (req, res) => {
    res.json(roomConfig);
});
// Liefert nur die Reihenfolge der Räume
app.get('/api/rooms/order', (req, res) => {
    res.json({ order: roomConfig.order || [] });
});
// Setzt die Reihenfolge der Räume
app.post('/api/rooms/order', express.json(), (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
        }
        roomConfig.order = order;
        fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf-8');
        console.log('🗂️ Raum-Reihenfolge gespeichert:', order);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Fehler beim Speichern der Raum-Reihenfolge:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
app.post('/api/rooms/update-icon', (req, res) => {
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
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Raum-Icons:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Gruppen API Endpoints
// Liefert die gesamte Gruppenkonfiguration inkl. Reihenfolge
app.get('/api/groups/config', (req, res) => {
    res.json(groupsConfig);
});
// Liefert nur die Reihenfolge der Gruppen
app.get('/api/groups/order', (req, res) => {
    res.json({ order: groupsConfig.order || [] });
});
// Setzt die Reihenfolge der Gruppen
app.post('/api/groups/order', express.json(), (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({ success: false, message: 'order muss ein Array sein' });
        }
        groupsConfig.order = order;
        fs.writeFileSync(groupsConfigPath, JSON.stringify(groupsConfig, null, 2), 'utf-8');
        console.log('🗂️ Gruppen-Reihenfolge gespeichert:', order);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Fehler beim Speichern der Gruppen-Reihenfolge:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Erstellt oder aktualisiert eine Gruppe
app.post('/api/groups/update', express.json(), (req, res) => {
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
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Gruppe:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Löscht eine Gruppe
app.delete('/api/groups/:groupName', (req, res) => {
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
    }
    catch (error) {
        console.error('Fehler beim Löschen der Gruppe:', error);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
});
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor Control Backend läuft auf http://0.0.0.0:${PORT}`);
    console.log(`📡 Verbindungen zu 3 SPS-Stationen konfiguriert`);
    console.log(`🌐 Netzwerk-Zugriff: http://192.168.178.93:${PORT}`);
});
