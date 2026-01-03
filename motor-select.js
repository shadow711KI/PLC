#!/usr/bin/env node
// motor-select.js
// Interaktives Menü zur Motorauswahl und Steuerung

import net from 'node:net';
import fs from 'fs';
import * as readline from 'readline';

const addresses = JSON.parse(fs.readFileSync('./addresses.json', 'utf-8'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

function sendCommand(host, port, addrLow, addrHigh, status, motorName) {
  return new Promise((resolve) => {
    const frame = buildFrame(addrLow, addrHigh, status);
    
    const sock = net.createConnection({ host, port });
    sock.setTimeout(2000);
    
    let response = '';
    let responseReceived = false;
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (buf) => {
      response = buf.toString('hex');
      responseReceived = true;
      if (response.includes('0203400006') || response.includes('0203400021')) {
        sock.destroy();
      }
    });
    
    sock.on('timeout', () => {
      sock.destroy();
      resolve({ success: responseReceived && (response.includes('0203400006') || response.includes('0203400021')) });
    });
    
    sock.on('error', () => {
      resolve({ success: false, error: 'Connection error' });
    });
    
    sock.on('close', () => {
      if (!responseReceived) {
        resolve({ success: false, error: 'No response' });
      } else if (response.includes('1503')) {
        resolve({ success: false, error: 'Motor not configured (Error 1503)' });
      } else if (response.includes('0203400006') || response.includes('0203400021')) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: 'Unknown response' });
      }
    });
  });
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function clearScreen() {
  console.clear();
}

async function showMotorList() {
  const motors = [];
  let idx = 1;
  
  console.log('\n════════════════════════════════════════════════════════');
  console.log('            MOTORSTEUERUNG - VERFÜGBARE MOTOREN');
  console.log('════════════════════════════════════════════════════════\n');
  
  for (const [spsName, spsData] of Object.entries(addresses)) {
    console.log(`\n${spsName}:`);
    if (spsData.motors) {
      for (const [motorName, motorData] of Object.entries(spsData.motors)) {
        console.log(`  ${idx}. ${motorName}`);
        motors.push({ idx, motorName, spsName, motorData, spsData });
        idx++;
      }
    }
  }
  
  console.log(`\n  0. BEENDEN`);
  console.log('\n════════════════════════════════════════════════════════\n');
  
  return motors;
}

async function showCommandMenu(motorName) {
  console.log(`\n════════════════════════════════════════════════════════`);
  console.log(`  MOTOR: ${motorName}`);
  console.log(`════════════════════════════════════════════════════════\n`);
  console.log(`  1. ⬆️  HOCH (UP)`);
  console.log(`  2. ⬇️  RUNTER (DOWN)`);
  console.log(`  3. ⏹️  STOP`);
  console.log(`  0. ZURÜCK ZUM MENÜ`);
  console.log(`\n════════════════════════════════════════════════════════\n`);
}

async function main() {
  while (true) {
    clearScreen();
    const motors = await showMotorList();
    
    const choice = await question('Wähle einen Motor (Nummer): ');
    
    if (choice === '0') {
      console.log('\n👋 Auf Wiedersehen!\n');
      rl.close();
      break;
    }
    
    const selectedMotor = motors.find(m => m.idx === parseInt(choice));
    
    if (!selectedMotor) {
      console.log('\n❌ Ungültige Auswahl!\n');
      await question('Drücke Enter zum Fortfahren...');
      continue;
    }
    
    // Command loop for selected motor
    let motorLoop = true;
    while (motorLoop) {
      clearScreen();
      await showCommandMenu(selectedMotor.motorName);
      
      const cmdChoice = await question('Wähle einen Befehl (Nummer): ');
      
      let status = null;
      let cmdName = '';
      
      if (cmdChoice === '1') {
        status = 0x01;
        cmdName = 'HOCH';
      } else if (cmdChoice === '2') {
        status = 0x02;
        cmdName = 'RUNTER';
      } else if (cmdChoice === '3') {
        status = 0x03;
        cmdName = 'STOP';
      } else if (cmdChoice === '0') {
        motorLoop = false;
        continue;
      } else {
        console.log('\n❌ Ungültige Auswahl!\n');
        await question('Drücke Enter zum Fortfahren...');
        continue;
      }
      
      console.log(`\n⏳ Sende Befehl: ${selectedMotor.motorName} → ${cmdName}...`);
      
      const result = await sendCommand(
        selectedMotor.spsData.host,
        selectedMotor.spsData.port,
        selectedMotor.motorData.addrLow,
        selectedMotor.motorData.addrHigh,
        status,
        selectedMotor.motorName
      );
      
      if (result.success) {
        console.log(`✅ ERFOLG! Motor ${selectedMotor.motorName} fährt ${cmdName}`);
      } else {
        console.log(`❌ FEHLER: ${result.error}`);
      }
      
      await question('\nDrücke Enter zum Fortfahren...');
    }
  }
}

main().catch(console.error);
