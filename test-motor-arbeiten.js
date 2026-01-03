// test-motor-arbeiten.js - KORRIGIERT
// Steuert Motor "Arbeiten" (Motor 6) mit den RICHTIGEN Adressen und Operand-Codes
// Adressen aus: Adressen-iHomeControl-K2-0.pdf
// Operand-Code: 0x01 mit Value-Low=0x48, Value-High=Status

import net from 'node:net';

const HOST = '192.168.178.234';
const PORT = 1001;
const STATION = 0x00;

// Motor "Arbeiten" = Motor 6
// Adressen aus Adressenliste für Motor 6:
const MOTOR_ADDR_LOW = 0x05;
const MOTOR_ADDR_HIGH = 0x00;

// Status-Codes
const STATUS_HOCH = 0x01;
const STATUS_RUNTER = 0x02;
const STATUS_STOP = 0x03;

function buildFrame(status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const opCount = 0x01;
  const opcode = 0x01;  // Operand-Code 0x01
  const valueLow = 0x48;  // Für Motor-Befehle
  const valueHigh = status;  // 0x01=HOCH, 0x02=RUNTER, 0x03=STOP
  
  const payload = [TYP, STATION, opCount, opcode, valueLow, valueHigh, MOTOR_ADDR_LOW, MOTOR_ADDR_HIGH];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  const frame = [...frameNoCksum, ckLow, ckHigh];
  return Buffer.from(frame);
}

console.log('Motor "Arbeiten" (Motor 6) - Fahrtsequenz:\n');

const sock = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log(`Verbunden mit ${HOST}:${PORT}\n`);

  // === 1. Motor RUNTERFAHREN ===
  const runter = buildFrame(STATUS_RUNTER);
  console.log('1. Sende: RUNTER');
  console.log(`   TX: ${runter.toString('hex')}`);
  sock.write(runter);

  // === Nach 2 Sekunden: STOP ===
  setTimeout(() => {
    const stop = buildFrame(STATUS_STOP);
    console.log('\n2. Sende: STOP (nach 2 Sekunden)');
    console.log(`   TX: ${stop.toString('hex')}`);
    sock.write(stop);
    
    // Verbindung nach 500ms schließen
    setTimeout(() => {
      sock.end();
    }, 500);
  }, 2000);
});

sock.on('data', (buf) => {
  console.log(`   RX: ${buf.toString('hex')}`);
});

sock.on('error', (e) => {
  console.error('Fehler:', e.message);
});

sock.on('close', () => {
  console.log('\nVerbindung geschlossen');
});
