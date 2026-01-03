// Standalone Zeitautomatik SPS Response Decoder (wie Backend)
// Usage: node decode_zeitautomatik_standalone.js <HEX_STRING>

const hexData = process.argv[2] || "0203400021021c4100000680ffb9cd80fff9cd80fff9cd80fd10f680f8390280f8390403c10f";

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function parseZeitautomatikResponse(buffer) {
    if (!buffer || buffer.length < 10) {
        console.log('⚠️  Keine gültige SPS-Antwort für Zeitautomatik erhalten');
        return [];
    }
    // Überspringe ACK-Frame falls vorhanden
    let dataFrame = buffer;
    if (buffer.length > 5 && buffer[0] === 0x02 && buffer[1] === 0x03) {
        dataFrame = buffer.slice(5);
    }
    // Finde Datenstart nach Header [02 1C 41 00 00 06]
    const dataStart = 6;
    const timePoints = [];
    for (let i = 0; i < 6; i++) {
        const offset = dataStart + (i * 4);
        if (offset + 4 > dataFrame.length) {
            timePoints.push({
                id: i + 1,
                weekdays: [],
                weekdayMask: 0,
                hour: null,
                minute: null,
                action: 'unbekannt',
                raw: [null, null, null, null],
                info: 'Keine Daten empfangen'
            });
            continue;
        }
        const bytes = dataFrame.slice(offset, offset + 4);
        const sa = (bytes[1] >> 2) & 1;
        const fr = (bytes[1] >> 1) & 1;
        const do_ = (bytes[1] >> 0) & 1;
        const mi = (bytes[2] >> 7) & 1;
        const di = (bytes[2] >> 6) & 1;
        const mo = (bytes[2] >> 5) & 1;
        const so = (bytes[2] >> 4) & 1;
        const weekdays = [];
        if (sa) weekdays.push('Sa');
        if (fr) weekdays.push('Fr');
        if (do_) weekdays.push('Do');
        if (mi) weekdays.push('Mi');
        if (di) weekdays.push('Di');
        if (mo) weekdays.push('Mo');
        if (so) weekdays.push('So');
        const h0 = (bytes[2] >> 0) & 1;
        const h1 = (bytes[2] >> 1) & 1;
        const h2 = (bytes[2] >> 2) & 1;
        const h3 = (bytes[2] >> 3) & 1;
        const h4 = (bytes[3] >> 7) & 1;
        const hourRaw = (h4 << 0) | (h3 << 1) | (h2 << 2) | (h1 << 3) | (h0 << 4);
        let hour = (hourRaw >= 0 && hourRaw <= 23) ? hourRaw : null;
        const m0 = (bytes[3] >> 6) & 1;
        const m1 = (bytes[3] >> 5) & 1;
        const m2 = (bytes[3] >> 4) & 1;
        const m3 = (bytes[3] >> 3) & 1;
        const m4 = (bytes[3] >> 2) & 1;
        const m5 = (bytes[3] >> 1) & 1;
        const minuteRaw = (m0 << 5) | (m1 << 4) | (m2 << 3) | (m3 << 2) | (m4 << 1) | (m5 << 0);
        let minute = (minuteRaw >= 0 && minuteRaw <= 59) ? minuteRaw : null;
        const isOn = (bytes[3] & 0x01) === 1;
        let action = isOn ? 'runter' : 'hoch';
        const weekdayMask = (so << 0) | (mo << 1) | (di << 2) | (mi << 3) | (do_ << 4) | (fr << 5) | (sa << 6);
        let info = '';
        if (hour === null) info += 'Stunde ungültig; ';
        if (minute === null) info += 'Minute ungültig; ';
        timePoints.push({
            id: i + 1,
            weekdays,
            weekdayMask,
            hour,
            minute,
            action,
            raw: Array.from(bytes),
            info: info.trim()
        });
    }
    return timePoints;
}

const bytes = hexToBytes(hexData);
const result = parseZeitautomatikResponse(bytes);
console.log('Dekodierte Zeitpunkte:');
for (const tp of result) {
    if (tp.hour !== null && tp.minute !== null) {
        console.log(`Zeitpunkt ${tp.id}: ${tp.weekdays.join(', ') || '-'} ${tp.hour.toString().padStart(2, '0')}:${tp.minute.toString().padStart(2, '0')} (${tp.action})`);
    } else {
        console.log(`Zeitpunkt ${tp.id}: (ungültig oder nicht vorhanden)`);
    }
}
