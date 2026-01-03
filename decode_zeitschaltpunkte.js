// decode_zeitschaltpunkte.js
// Usage: node decode_zeitschaltpunkte.js <hexstring>

function hexStringToBytes(hex) {
    const bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

function decodeZeitschaltpunkt(bytes) {
    // 4 bytes pro Zeitschaltpunkt, Big Endian
    const value = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    const aktion = value & 0x1;
    const minute = (value >> 1) & 0x3F;
    const stunde = (value >> 7) & 0x1F;
    const wochentage = (value >> 12) & 0x7F;
    const tage = [
        !!(wochentage & 0x40), // Sa (Bit 18)
        !!(wochentage & 0x20), // Fr (Bit 17)
        !!(wochentage & 0x10), // Do (Bit 16)
        !!(wochentage & 0x08), // Mi (Bit 15)
        !!(wochentage & 0x04), // Di (Bit 14)
        !!(wochentage & 0x02), // Mo (Bit 13)
        !!(wochentage & 0x01), // So (Bit 12)
    ];
    return {
        aktion: aktion ? "hoch" : "runter",
        minute,
        stunde,
        tage
    };
}

function main() {
    const hex = process.argv[2].replace(/\s+/g, "");
    const bytes = hexStringToBytes(hex);
    // Die ersten 11 Bytes und die letzten 3 Bytes weglassen
    const relevant = bytes.slice(11, bytes.length - 3);
    for (let i = 0; i < relevant.length; i += 4) {
        const block = relevant.slice(i, i + 4);
        if (block.length < 4) break;
        const res = decodeZeitschaltpunkt(block);
        console.log(`Schaltpunkt ${i/4 + 1}: ${res.stunde.toString().padStart(2, '0')}:${res.minute.toString().padStart(2, '0')} ${res.aktion} Tage: ${res.tage.map((t,idx)=>t?['Sa','Fr','Do','Mi','Di','Mo','So'][idx]:'').filter(Boolean).join(',')}`);
    }
}

main();
