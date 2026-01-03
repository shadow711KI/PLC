// Zeitautomatik SPS response decoder for Wohnen_Ost
// Usage: node decode_zeitautomatik_wohnen_ost.js


// SPS Zeitautomatik Antwort für Wohnen_Ost (HEX-String)
const hexData = "0203400021021c4100000680ffe48180fbe8bc80fc150180fc188080f8143c80f81abc03060e";

// Hilfsfunktion: HEX-String zu Byte-Array
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// Wochentage dekodieren
function decodeDays(byte) {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return days.filter((_, idx) => ((byte >> idx) & 1)).reverse();
}

// Zeit dekodieren
function decodeTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Aktion dekodieren
function decodeAction(byte) {
    return byte === 0 ? 'Fahrt runter' : 'Fahrt hoch';
}

// Zeitpunkte dekodieren (Start: Byte 11, je 5 Bytes pro Zeit)
function decodeTimepoint(bytes, offset) {
    const days = decodeDays(bytes[offset]);
    const hour = bytes[offset + 1];
    const minute = bytes[offset + 2];
    const action = decodeAction(bytes[offset + 3]);
    // bytes[offset+4] = 0x80 (immer, laut Muster)
    return { days, time: decodeTime(hour, minute), action };
}


const bytes = hexToBytes(hexData);

// Die Antwort hat 38 Bytes, Zeitpunkte starten ab Byte 11, je 5 Bytes pro Zeit, bis vor ETX/Checksumme
const start = 11;
const maxTimepoints = Math.floor((bytes.length - start - 3) / 5); // -3 für ETX + 2xChecksum

console.log("Decoding Zeitautomatik SPS response for Wohnen_Ost:");
for (let i = 0; i < maxTimepoints; i++) {
    const offset = start + i * 5;
    if (offset + 5 > bytes.length - 3) {
        console.log(`Timepoint ${i+1}: (keine Daten mehr)`);
        continue;
    }
    const tp = decodeTimepoint(bytes, offset);
    // Prüfe auf plausible Werte
    const valid = Number.isFinite(tp.time.split(':')[0]) && Number.isFinite(tp.time.split(':')[1]);
    console.log(`Timepoint ${i+1}: Days: ${tp.days.join(', ') || '-'}, Time: ${tp.time}, Action: ${tp.action}`);
}
if (maxTimepoints < 6) {
    for (let i = maxTimepoints; i < 6; i++) {
        console.log(`Timepoint ${i+1}: (nicht vorhanden)`);
    }
}

