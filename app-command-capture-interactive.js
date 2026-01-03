#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

const REAL_SPS = '192.168.178.234';
const REAL_PORT = 1001;
const LISTEN_PORT = 9001;

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

// Log-Datei
const logFile = 'app-commands-interactive.log';
const jsonFile = 'app-commands-interactive.json';

let commands = [];
let pendingCommand = null;

// Readline Interface für User Input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║    APP COMMAND CAPTURE - INTERACTIVE TCP Logger       ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`📱 Verbindungsanfrage erwartet von: App auf beliebigem Port`);
console.log(`📡 Server lauscht auf:  ${LOCAL_IP}:${LISTEN_PORT}`);
console.log(`🔗 Leitet weiter zu:    ${REAL_SPS}:${REAL_PORT}\n`);

console.log('📝 Befehle werden gespeichert in:');
console.log(`   - ${logFile} (lesbar)`);
console.log(`   - ${jsonFile} (strukturiert)\n`);

console.log('💡 Nach jedem Befehl können Sie die App-Aktion eingeben!\n');
console.log('═══════════════════════════════════════════════════════════\n');

let clientCounter = 0;
let commandCounter = 0;

function askForAppAction(cmdEntry) {
  return new Promise((resolve) => {
    rl.question(`\n➡️  Was haben Sie in der App gedrückt? (z.B. "Wohnen Ost Hoch", "Motor 3 Runter", etc.): `, (answer) => {
      cmdEntry.userAction = answer.trim();
      
      // Update log mit User-Input
      fs.appendFileSync(logFile, `   👤 APP-AKTION: ${cmdEntry.userAction}\n\n`);
      
      // Speichere JSON
      fs.writeFileSync(jsonFile, JSON.stringify(commands, null, 2));
      
      console.log(`   ✅ Gespeichert!\n`);
      resolve();
    });
  });
}

const server = net.createServer((appConnection) => {
  clientCounter++;
  const clientId = clientCounter;
  const clientIP = appConnection.remoteAddress;
  
  console.log(`\n✅ App verbunden (Session #${clientId}) von ${clientIP}`);
  
  // Verbinde mit echte SPS
  const spsConnection = net.createConnection(
    { host: REAL_SPS, port: REAL_PORT },
    () => {
      console.log(`   ↔️  Weitergeleitet zu SPS: ${REAL_SPS}:${REAL_PORT}\n`);
    }
  );
  
  // App → SPS
  appConnection.on('data', async (data) => {
    commandCounter++;
    const timestamp = new Date().toLocaleTimeString('de-DE');
    const hex = data.toString('hex').toUpperCase();
    
    // Analysiere Frame
    let motorByte = '??';
    let action = '??';
    let motorNr = '??';
    let format = 'unbekannt';
    
    if (hex.length >= 26) {
      // Format 1: Kurz (13 bytes, 26 hex chars)
      if (hex.length === 26) {
        format = 'einfach';
        motorByte = hex.substring(12, 14);
        const status = hex.substring(14, 16);
        
        // Bestimme Motor-Nummer aus Byte (0x02 + (nr-1)*0x10)
        const motorByteVal = parseInt(motorByte, 16);
        if (motorByteVal >= 0x02 && motorByteVal <= 0x52) {
          motorNr = String(Math.floor((motorByteVal - 0x02) / 0x10) + 1);
        }
        
        // Bestimme Aktion
        if (status === '01') action = 'HOCH';
        else if (status === '02') action = 'RUNTER';
        else if (status === '03') action = 'STOP';
      }
      // Format 2: Lang (27 bytes, 54 hex chars) - App Format
      else if (hex.length >= 54) {
        format = 'komplex (App)';
        // Bei 54+ hex chars ist es wahrscheinlich das App-Format
        // Versuche verschiedene Positionen
        const opcode = hex.substring(6, 8);
        
        if (opcode === '04') {
          // OpCode 0x04 Format
          const befehl = hex.substring(12, 14);
          
          // Versuche Motor-ID zu extrahieren
          if (befehl === '5D') action = 'HOCH';
          else if (befehl === '5B') action = 'RUNTER';
          else if (befehl === '0D') action = 'RUNTER';
          else if (befehl === '1D') action = 'RUNTER';
          else if (befehl === '2D') action = 'RUNTER';
          else if (befehl === '3D') action = 'RUNTER';
          else if (befehl === '4D') action = 'RUNTER';
        }
      }
    }
    
    const cmdEntry = {
      timestamp,
      command: commandCounter,
      session: clientId,
      hex,
      format,
      motorByte,
      motorNr,
      action,
      length: data.length,
      userAction: '' // Wird vom User ausgefüllt
    };
    
    commands.push(cmdEntry);
    
    // Konsole
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${timestamp}] Befehl #${commandCounter}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Format:    ${format}`);
    console.log(`   Motor:     ${motorNr}`);
    console.log(`   Aktion:    ${action}`);
    console.log(`   Länge:     ${data.length} bytes`);
    console.log(`   HEX:       ${hex}`);
    
    // Text-Log (ohne User-Action, wird später hinzugefügt)
    fs.appendFileSync(logFile, 
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `[${timestamp}] Befehl #${commandCounter}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Format:    ${format}\n` +
      `Motor:     ${motorNr}\n` +
      `Aktion:    ${action}\n` +
      `Länge:     ${data.length} bytes\n` +
      `HEX:       ${hex}\n`
    );
    
    // Leite zur SPS weiter (sofort, nicht auf User-Input warten)
    spsConnection.write(data);
    
    // Frage User nach Aktion
    await askForAppAction(cmdEntry);
  });
  
  // SPS → App
  spsConnection.on('data', (data) => {
    const timestamp = new Date().toLocaleTimeString('de-DE');
    const hex = data.toString('hex').toUpperCase();
    
    // Logge SPS-Antwort
    console.log(`\n   📥 SPS-ANTWORT (${data.length} bytes): ${hex}`);
    
    fs.appendFileSync(logFile, 
      `   📥 SPS-ANTWORT: ${hex} (${data.length} bytes)\n`
    );
    
    appConnection.write(data);
  });
  
  appConnection.on('error', (err) => {
    console.log(`⚠️  Fehler (#${clientId}): ${err.message}`);
    spsConnection.destroy();
  });
  
  spsConnection.on('error', (err) => {
    console.log(`⚠️  SPS-Fehler (#${clientId}): ${err.message}`);
    appConnection.destroy();
  });
  
  appConnection.on('close', () => {
    console.log(`👋 Session #${clientId} beendet\n`);
    spsConnection.destroy();
    
    // Speichere JSON
    fs.writeFileSync(jsonFile, JSON.stringify(commands, null, 2));
  });
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log('🟢 SERVER AKTIV - Warte auf App-Verbindung...\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${LISTEN_PORT} ist bereits in Benutzung!`);
    console.error('   Lösung: Port freigeben oder anderen Port nutzen');
  } else {
    console.error(`\n❌ Fehler: ${err.message}`);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Logger wird beendet...');
  
  // Finale JSON speichern
  if (commands.length > 0) {
    fs.writeFileSync(jsonFile, JSON.stringify(commands, null, 2));
    console.log(`\n✅ ${commands.length} Befehle gespeichert!`);
    console.log(`   📄 ${logFile}`);
    console.log(`   📊 ${jsonFile}`);
  }
  
  rl.close();
  server.close(() => {
    console.log('\n👋 Auf Wiedersehen!\n');
    process.exit(0);
  });
});
