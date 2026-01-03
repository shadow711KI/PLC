// Zeitautomatik SPS response decoder for Arbeiten
// Usage: node decode_zeitautomatik_arbeiten.js

const hexData = "0203400021021c4100000680ffb9cd80fff9cd80fff9cd80fd10f680f8390280f8390403c10f";

function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function decodeDays(byte) {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return days.filter((_, idx) => ((byte >> idx) & 1)).reverse();
}

function decodeTime(hour, minute) {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function decodeAction(byte) {
    return byte === 0 ? 'Fahrt runter' : 'Fahrt hoch';
}

function decodeTimepoint(bytes, offset) {
    const days = decodeDays(bytes[offset]);
    const hour = bytes[offset + 1];
    const minute = bytes[offset + 2];
    const action = decodeAction(bytes[offset + 3]);
    return { days, time: decodeTime(hour, minute), action };
}

const bytes = hexToBytes(hexData);
const start = 11;
const maxTimepoints = Math.floor((bytes.length - start - 3) / 5);

console.log("Decoding Zeitautomatik SPS response for Arbeiten:");
for (let i = 0; i < maxTimepoints; i++) {
    const offset = start + i * 5;
    if (offset + 5 > bytes.length - 3) {
        console.log(`Timepoint ${i+1}: (keine Daten mehr)`);
        continue;
    }
    const tp = decodeTimepoint(bytes, offset);
    console.log(`Timepoint ${i+1}: Days: ${tp.days.join(', ') || '-'}, Time: ${tp.time}, Action: ${tp.action}`);
}
if (maxTimepoints < 6) {
    for (let i = maxTimepoints; i < 6; i++) {
        console.log(`Timepoint ${i+1}: (nicht vorhanden)`);
    }
}
