#!/usr/bin/env node
// find-wohnen-ost-address.js
// Findet die echte Adresse von Wohnen_Ost durch Brute-Force

import net from 'node:net';

const HOST = '192.168.178.234';
const PORT = 1001;

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

function testAddress(addrLow, addrHigh) {
  return new Promise((resolve) => {
    const frame = buildFrame(addrLow, addrHigh, 0x02); // DOWN command
    
    const sock = net.createConnection({ host: HOST, port: PORT });
    sock.setTimeout(2000);
    
    let response = '';
    
    sock.on('connect', () => {
      sock.write(frame);
    });
    
    sock.on('data', (buf) => {
      response = buf.toString('hex');
      sock.destroy();
    });
    
    sock.on('timeout', () => {
      sock.destroy();
      resolve(null);
    });
    
    sock.on('error', () => {
      resolve(null);
    });
    
    sock.on('close', () => {
      if (response.includes('0203400006') || response.includes('0203400021')) {
        resolve(true);
      } else if (response.includes('1503')) {
        resolve(false);
      } else {
        resolve(null);
      }
    });
  });
}

(async () => {
  console.log('═════════════════════════════════════════════════');
  console.log('SUCHE NACH WOHNEN_OST ADDRESS...');
  console.log('Teste alle Adressen 0x00-0xFF');
  console.log('═════════════════════════════════════════════════\n');
  
  const workingAddresses = [];
  
  for (let addr = 0; addr <= 255; addr++) {
    process.stdout.write(`Testing 0x${addr.toString(16).padStart(2,'0')}... `);
    
    const result = await testAddress(addr, 0x00);
    
    if (result === true) {
      console.log('✅ ANTWORTET (Motor konfiguriert!)');
      workingAddresses.push(addr);
    } else if (result === false) {
      console.log('❌ Fehler 1503 (nicht konfiguriert)');
    } else {
      console.log('❓ Keine Antwort');
    }
    
    await new Promise(r => setTimeout(r, 50)); // Small delay
  }
  
  console.log('\n═════════════════════════════════════════════════');
  console.log('ERGEBNIS:');
  console.log('═════════════════════════════════════════════════');
  
  if (workingAddresses.length === 0) {
    console.log('❌ Keine funktionierenden Adressen gefunden!');
    console.log('   → Motor ist wahrscheinlich nicht konfiguriert');
  } else {
    console.log(`✅ Funktioniert mit folgenden Adressen:`);
    for (const addr of workingAddresses) {
      console.log(`   → 0x${addr.toString(16).padStart(2,'0')} (dezimal ${addr})`);
    }
    
    console.log('\nWohnen_Ost befindet sich wahrscheinlich bei Adresse:');
    console.log(`   → 0x${workingAddresses[0].toString(16).padStart(2,'0')}`);
    
    if (workingAddresses[0] !== 1) {
      console.log('\n⚠️  ACHTUNG: Das ist NICHT 0x01!');
      console.log(`    Korrigiere addresses.json auf addrLow: ${workingAddresses[0]}`);
    }
  }
  
  console.log('\n═════════════════════════════════════════════════\n');
})();
