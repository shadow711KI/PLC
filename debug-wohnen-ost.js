#!/usr/bin/env node
// debug-wohnen-ost.js
// Debug-Skript für Wohnen_Ost

import net from 'node:net';
import fs from 'fs';

const addresses = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));
const motorData = addresses.SPS1.motors.Wohnen_Ost;
const spsData = addresses.SPS1;

console.log('═════════════════════════════════════════════════');
console.log('DEBUG: Wohnen_Ost Motor');
console.log('═════════════════════════════════════════════════\n');

console.log('Konfiguration:');
console.log(`  Host: ${spsData.host}`);
console.log(`  Port: ${spsData.port}`);
console.log(`  Motor-Adresse Low: 0x${motorData.addrLow.toString(16)}`);
console.log(`  Motor-Adresse High: 0x${motorData.addrHigh.toString(16)}`);
console.log(`  Motor-Nr: ${motorData.nr}`);

function buildFrame(addrLow, addrHigh, status) {
  const STX = 0x02, ETX = 0x03, TYP = 0x41;
  const befLow = 0x00, befHigh = 0x00;
  const opCount = 0x01;
  const operCode = 0x48;
  const operStat = status;
  
  const payload = [TYP, befLow, befHigh, opCount, operCode, addrLow, addrHigh, operStat];
  const len = payload.length;
  const frameNoCksum = [STX, len, ...payload, ETX];
  
  let sum = 0;
  for (let i = 2; i < frameNoCksum.length - 1; i++) {
    sum += frameNoCksum[i];
  }
  
  const ckLow = sum & 0xFF;
  const ckHigh = (sum >> 8) & 0xFF;
  
  return Buffer.from([...frameNoCksum, ckLow, ckHigh]);
}

function testCommand(status, statusName) {
  return new Promise((resolve) => {
    const frame = buildFrame(motorData.addrLow, motorData.addrHigh, status);
    
    console.log(`\n▶️  Test: ${statusName}`);
    console.log(`  Telegram: ${frame.toString('hex').toUpperCase()}`);
    
    const sock = net.createConnection({ host: spsData.host, port: spsData.port });
    sock.setTimeout(3000);
    
    let response = '';
    let receivedTime = null;
    
    sock.on('connect', () => {
      console.log(`  [${new Date().toLocaleTimeString()}] ✓ Verbindung hergestellt`);
      sock.write(frame);
      console.log(`  [${new Date().toLocaleTimeString()}] → Telegram gesendet`);
    });
    
    sock.on('data', (buf) => {
      receivedTime = new Date().toLocaleTimeString();
      response = buf.toString('hex');
      console.log(`  [${receivedTime}] ← Antwort: ${response.toUpperCase()}`);
      sock.destroy();
    });
    
    sock.on('timeout', () => {
      console.log(`  ✗ TIMEOUT - Keine Antwort nach 3s`);
      sock.destroy();
      resolve(false);
    });
    
    sock.on('error', (e) => {
      console.log(`  ✗ FEHLER: ${e.message}`);
      resolve(false);
    });
    
    sock.on('close', () => {
      if (response.includes('0203400006') || response.includes('0203400021')) {
        console.log(`  ✅ SPS akzeptiert den Befehl`);
        resolve(true);
      } else if (response.includes('1503')) {
        console.log(`  ❌ FEHLER 1503: Motor nicht konfiguriert!`);
        resolve(false);
      } else if (response === '') {
        console.log(`  ✗ Keine Antwort`);
        resolve(false);
      } else {
        console.log(`  ❓ Unbekannte Antwort`);
        resolve(false);
      }
    });
  });
}

(async () => {
  console.log('\n═════════════════════════════════════════════════');
  console.log('BEFEHLE TESTEN...');
  console.log('═════════════════════════════════════════════════');
  
  await testCommand(0x02, 'RUNTER (DOWN)');
  await new Promise(r => setTimeout(r, 500));
  
  await testCommand(0x01, 'HOCH (UP)');
  await new Promise(r => setTimeout(r, 500));
  
  await testCommand(0x03, 'STOP');
  
  console.log('\n═════════════════════════════════════════════════');
  console.log('❓ FRAGEN ZUM TESTEN:');
  console.log('═════════════════════════════════════════════════');
  console.log('1. Sieht du oben ✅ ERFOLG bei jedem Befehl?');
  console.log('2. Oder bekommst du ❌ FEHLER oder ✗ TIMEOUT?');
  console.log('3. Fährt die Jalousie physisch rauf/runter?');
  console.log('═════════════════════════════════════════════════\n');
})();
// [EXPERIMENTELL/DEBUG] Debug-Skript für Wohnen_Ost
