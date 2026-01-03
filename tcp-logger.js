#!/usr/bin/env node
// tcp-logger.js
// Speichert ALLE TCP-Befehle von der App in eine Datei + zeigt sie an

const net = require('net');
const fs = require('fs');
const os = require('os');

const REAL_SPS = '192.168.178.234';
const REAL_PORT = 1001;
const LISTEN_PORT = 9001;
const MAPPER_PORT = 9002;

// Hole Computer-IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const LOCAL_IP = getLocalIP();

// Öffne Log-Datei
const logFile = fs.createWriteStream('./motor-commands.log', { flags: 'a' });

// Mapper-Verbindung
let mapperClients = [];

const mapperServer = net.createServer((socket) => {
  mapperClients.push(socket);
  socket.on('error', () => {
    mapperClients = mapperClients.filter(c => c !== socket);
  });
  socket.on('close', () => {
    mapperClients = mapperClients.filter(c => c !== socket);
  });
});

mapperServer.listen(9002, '127.0.0.1');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         TCP LOGGER - Alle App-Befehle abhören          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📱 Die App verbindet sich ganz normal mit:');
console.log(`   ${REAL_SPS}:${REAL_PORT}\n`);

console.log('📝 Alle Befehle werden geloggt in: motor-commands.log\n');

let clientCounter = 0;
let commandCounter = 0;

const server = net.createServer((appConnection) => {
  clientCounter++;
  const clientId = clientCounter;
  
  console.log(`\n✅ App verbunden (Session #${clientId})`);
  
  // Verbinde mit der echten SPS
  const spsConnection = net.createConnection(
    { host: REAL_SPS, port: REAL_PORT },
    () => {
      console.log(`   ↔️  Verbindung zur echten SPS etabliert\n`);
    }
  );
  
  // App → SPS
  appConnection.on('data', (data) => {
    commandCounter++;
    const timestamp = new Date().toLocaleTimeString();
    const hex = data.toString('hex').toUpperCase();
    
    // Schicke auch an alle Mapper-Clients wenn verbunden
    mapperClients.forEach(client => {
      try {
        if (client.writable) {
          client.write(data);
        }
      } catch (e) {
        // Fehler ignorieren
      }
    });
    
    // Analysiere den Frame
    let analysis = '';
    if (data.length >= 10) {
      const addrLow = data[8];
      const addrHigh = data[9];
      const status = data[7];
      const statusName = { 0x01: 'HOCH', 0x02: 'RUNTER', 0x03: 'STOP' }[status] || `0x${status.toString(16)}`;
      
      analysis = `  → Adresse: [Low=0x${addrLow.toString(16).padStart(2, '0')}, High=0x${addrHigh.toString(16).padStart(2, '0')}]  Befehl: ${statusName}`;
    }
    
    const output = `[${timestamp}] Cmd #${commandCounter}: ${hex}${analysis}`;
    
    console.log(output);
    logFile.write(output + '\n');
    
    // Leite zur echten SPS weiter
    spsConnection.write(data);
  });
  
  // SPS → App (stumm weiterleiten)
  spsConnection.on('data', (data) => {
    appConnection.write(data);
  });
  
  appConnection.on('error', (err) => {
    console.log(`\n⚠️  Fehler (#${clientId}): ${err.message}`);
    spsConnection.destroy();
  });
  
  spsConnection.on('error', (err) => {
    console.log(`\n⚠️  SPS-Fehler (#${clientId}): ${err.message}`);
    appConnection.destroy();
  });
  
  appConnection.on('close', () => {
    console.log(`\n👋 Session #${clientId} beendet\n`);
    spsConnection.destroy();
  });
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`🟢 LOGGER AKTIV`);
  console.log(`   Lauscht auf: ${LOCAL_IP}:${LISTEN_PORT}`);
  console.log(`   Leitet zu:   ${REAL_SPS}:${REAL_PORT}`);
  console.log(`   Mapper Port: ${MAPPER_PORT}\n`);
  console.log('📱 ANLEITUNG:');
  console.log(`   1. Stelle die App auf: ${LOCAL_IP}:${LISTEN_PORT}`);
  console.log(`   2. Bediene Motoren in der App`);
  console.log(`   3. Alle Befehle werden hier gezeigt!\n`);
  console.log('═══════════════════════════════════════════════════════════\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${REAL_PORT} ist bereits in Benutzung!`);
    console.error('   (Wahrscheinlich die echte SPS läuft noch)');
  } else {
    console.error(`\n❌ Fehler: ${err.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Logger wird beendet...');
  logFile.end();
  server.close();
  process.exit(0);
});

