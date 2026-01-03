// tcp-hex-receive.js
// Verbindet sich mit der SPS und zeigt empfangene Daten als HEX an

import net from 'node:net';

const HOST = '192.168.178.234'; // SPS-IP
const PORT = 1001;              // SPS-Port


// === Hier Befehl wählen ===
// Freigabe (Automatik AUS):
const hexFreigabe = '020641000169560003b601';
// Motor RUNTER:
const hexRunter   = '02064100014802520003d601';
// Motor HOCH:
const hexHoch     = '02064100014801510003d501';
// Motor STOP:
const hexStop     = '020641000148035d0003e801';

// === Zu sendenden Befehl hier auswählen ===
const hex = hexHoch; // Ändere zu hexFreigabe, hexRunter, hexStop nach Bedarf

const client = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log(`Verbunden mit ${HOST}:${PORT}`);
  client.write(Buffer.from(hex, 'hex'));
});

client.on('data', (data) => {
  // Empfangene Daten als HEX anzeigen
  console.log('Empfangen (HEX):', data.toString('hex'));
});

client.on('error', (err) => {
  console.error('Fehler:', err.message);
});

client.on('close', () => {
  console.log('Verbindung geschlossen');
});
