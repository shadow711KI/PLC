#!/usr/bin/env node
// wohnen-ost-test.js
// Einfaches Testskript für Wohnen_Ost Motor

const net = require('net');
const fs = require('fs');
const readline = require('readline');

const config = JSON.parse(fs.readFileSync('./addresses.json', 'utf8'));
const motor = config.SPS1.motors.Wohnen_Ost;

function buildFrame(status, addrLow, addrHigh) {
  const frame = Buffer.from([
    0x02, 0x08, 0x41, 0x00, 0x01, 0x01, 0x48,
    status, addrLow, addrHigh
  ]);
  
  let sum = 0;
  for (let i = 2; i < frame.length; i++) {
    sum += frame[i];
  }
  return Buffer.concat([frame, Buffer.from([0x03, sum & 0xFF, (sum >> 8) & 0xFF])]);
}

function sendCommand(command) {
  return new Promise((resolve) => {
    const statusMap = { 'hoch': 0x01, 'runter': 0x02, 'stop': 0x03 };
    const statusValue = statusMap[command.toLowerCase()];
    
    if (!statusValue) {
      console.log(`\n❌ Unbekannter Befehl: ${command}`);
      console.log('Gültig: hoch, runter, stop\n');
      resolve();
      return;
    }
    
    const frame = buildFrame(statusValue, motor.addrLow, motor.addrHigh);
    
    console.log(`\n📤 Sende Befehl: ${command.toUpperCase()}`);
    console.log(`   Adresse: Low=0x${motor.addrLow.toString(16).padStart(2, '0')}, High=0x${motor.addrHigh.toString(16).padStart(2, '0')}`);
    console.log(`   Frame: ${frame.toString('hex')}`);
    
    const sock = net.createConnection(
      { host: config.SPS1.host, port: config.SPS1.port },
      () => {
        let responses = '';
        
        sock.on('data', (data) => {
          responses += data.toString('hex');
          console.log(`   📥 Response: ${data.toString('hex')}`);
        });
        
        sock.write(frame);
        
        setTimeout(() => {
          if (responses.includes('0203400006') || responses.includes('0203400021')) {
            console.log('   ✅ ERFOLG - Motor sollte sich bewegen!\n');
          } else if (responses.includes('1503')) {
            console.log('   ❌ Motor nicht konfiguriert (Fehler 1503)\n');
          } else if (responses === '') {
            console.log('   ⏱️  Keine Antwort von SPS1\n');
          } else {
            console.log('   ⚠️  Unbekannte Antwort\n');
          }
          sock.destroy();
          resolve();
        }, 800);
      }
    );
    
    sock.on('error', (err) => {
      console.log(`   ❌ Fehler: ${err.message}\n`);
      resolve();
    });
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         WOHNEN_OST MOTOR TEST                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('Befehle:');
  console.log('  hoch      - Motor fährt nach oben');
  console.log('  runter    - Motor fährt nach unten');
  console.log('  stop      - Motor stoppt (sofort)');
  console.log('  schatten  - Beschattungsfahrt (runter + stop nach 100ms)');
  console.log('  exit      - Programm beenden\n');
  
  const askCommand = () => {
    rl.question('Befehl eingeben: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n👋 Auf Wiedersehen!\n');
        rl.close();
        process.exit(0);
      }
      
      if (input.toLowerCase() === 'schatten') {
        console.log('\n📤 Beschattungsfahrt (RUNTER → 100ms Pause → STOP)');
        await sendCommand('runter');
        await new Promise(r => setTimeout(r, 100));
        await sendCommand('stop');
      } else {
        await sendCommand(input);
      }
      
      askCommand();
    });
  };
  
  askCommand();
}

main().catch(console.error);
