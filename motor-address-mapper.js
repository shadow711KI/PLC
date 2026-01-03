#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const motors = [
  'Wohnen_Ost',
  'Wohnen_Sued_links',
  'Wohnen_Sued_rechts',
  'Wohnen_West_links',
  'Wohnen_West_rechts',
  'Arbeiten'
];

const motorAddresses = {};
let lastFrameData = null;
let captureMode = false;
let currentMotor = null;

// Verbinde mit tcp-logger um Frames zu schnappen
const loggerConnection = net.createConnection(
  { host: '127.0.0.1', port: 9002 },
  () => {
    console.log('✅ Mit Mapper-Port des Loggers verbunden!\n');
    startMapping();
  }
);

loggerConnection.on('data', (data) => {
  if (captureMode && currentMotor) {
    lastFrameData = {
      hex: data.toString('hex').toUpperCase(),
      timestamp: new Date().toLocaleTimeString()
    };
    console.log(`   ✅ Frame empfangen: ${lastFrameData.hex.substring(0, 30)}...`);
  }
});

loggerConnection.on('error', (err) => {
  console.error('\n❌ Fehler beim Verbinden zum Mapper-Port:');
  console.error(`   ${err.message}`);
  console.error('\n   Vergewissere dich, dass tcp-logger.js läuft und verbunden ist!');
  process.exit(1);
});

loggerConnection.on('close', () => {
  console.log('\nVerbindung geschlossen');
  process.exit(0);
});

async function startMapping() {
  console.log('🎯 Für jeden Motor wird gefragt:\n');
  
  for (const motor of motors) {
    currentMotor = motor;
    lastFrameData = null;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Motor: ${motor}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    await new Promise((resolve) => {
      captureMode = true;
      console.log(`\n⏳ Bitte drücke im App "${motor} RUNTER", dann hier Enter drücken:`);
      
      rl.question('> ', async (answer) => {
        if (lastFrameData) {
          const analysis = analyzeFrame(lastFrameData.hex);
          motorAddresses[motor] = {
            frame: lastFrameData.hex,
            time: lastFrameData.timestamp,
            ...analysis
          };
          
          console.log(`\n   ✅ Erfasst für ${motor}:`);
          console.log(`      Befehl: 0x${analysis.befehl}`);
          console.log(`      Addr Low: 0x${analysis.addrLow}`);
          console.log(`      Addr High: 0x${analysis.addrHigh}`);
          console.log(`      Opcode: 0x${analysis.opcode}`);
        } else {
          console.log(`   ⚠️  Kein Frame empfangen! Übersprungen.`);
        }
        captureMode = false;
        resolve();
      });
    });
  }
  
  console.log('\n\n╔════════════════════════════════════════════════════╗');
  console.log('║              ✅ MAPPING ABGESCHLOSSEN             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  // Zeige Zusammenfassung
  console.log('📊 MOTOR-ADRESSEN ÜBERSICHT:\n');
  for (const [motor, data] of Object.entries(motorAddresses)) {
    console.log(`${motor}:`);
    console.log(`  → Addr: [Low=0x${data.addrLow}, High=0x${data.addrHigh}]`);
    console.log(`  → Befehl: 0x${data.befehl}`);
    console.log(`  → OpCode: 0x${data.opcode}`);
  }
  
  // Speichere in JSON
  const outputFile = 'motor-addresses-mapped.json';
  fs.writeFileSync(outputFile, JSON.stringify(motorAddresses, null, 2));
  console.log(`\n💾 Gespeichert in: ${outputFile}\n`);
  
  rl.close();
  process.exit(0);
}

function analyzeFrame(hex) {
  // Frame format: STX | LEN | TYP | STATION | OPCOUNT | OPCODE | MOTOROP | STATUS | ADDRLOW | ADDRHIGH | ...
  // Bytes:       0    1-2   3-4   5-6      7-8      9-10    11-12   13-14   15-16   17-18
  
  const len = hex.substring(2, 4);
  const typ = hex.substring(4, 6);
  const opcode = hex.substring(10, 12);  // Position 5-6 = Byte 5
  
  let addrLow = '??';
  let addrHigh = '??';
  let befehl = '??';
  let motorop = hex.substring(12, 14);  // MOTOROP
  let status = hex.substring(14, 16);   // STATUS
  
  // Einfaches Format (OpCode 0x01)
  if (opcode === '01') {
    motorop = hex.substring(12, 14);    // Position 6
    status = hex.substring(14, 16);      // Position 7
    addrLow = hex.substring(16, 18);     // Position 8
    addrHigh = hex.substring(18, 20);    // Position 9
    befehl = motorop;
  }
  
  return {
    opcode: opcode,
    befehl: befehl,
    addrLow: addrLow,
    addrHigh: addrHigh,
    frameLength: hex.length,
    fullHex: hex,
    motorop: motorop,
    status: status
  };
}
