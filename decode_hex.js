// Decoding the HEX data from the log line
const hexData = "022E4100010669570080FFF9CD69580080FFF9CD69590080FFF9CD695A0080FD10F6695B0080F83902695C0080F81904037114";

// Function to convert HEX to binary
function hexToBinary(hex) {
    return hex.split('').map(h => parseInt(h, 16).toString(2).padStart(4, '0')).join('');
}

// Function to decode days of the week
function decodeDays(byte) {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const binary = parseInt(byte, 16).toString(2).padStart(8, '0');
    return days.filter((_, index) => binary[7 - index] === '1');
}

// Function to decode time (hours and minutes)
function decodeTime(byte1, byte2) {
    const hours = parseInt(byte1, 16);
    const minutes = parseInt(byte2, 16);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Function to decode action status
function decodeAction(byte) {
    return parseInt(byte, 16) === 0 ? 'Fahrt runter' : 'Fahrt hoch';
}

// Decoding Bytes 10–13
const days1 = decodeDays(hexData.slice(18, 20));
const time1 = decodeTime(hexData.slice(20, 22), hexData.slice(22, 24));
const action1 = decodeAction(hexData.slice(24, 26));

// Decoding Bytes 14–17
const days2 = decodeDays(hexData.slice(26, 28));
const time2 = decodeTime(hexData.slice(28, 30), hexData.slice(30, 32));
const action2 = decodeAction(hexData.slice(32, 34));

console.log("Decoded Values:");
console.log(`Bytes 10–13: Days: ${days1.join(', ')}, Time: ${time1}, Action: ${action1}`);
console.log(`Bytes 14–17: Days: ${days2.join(', ')}, Time: ${time2}, Action: ${action2}`);