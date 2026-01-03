#!/usr/bin/env node
// schatten-test.js - Test Beschattungsfahrt mit verschiedenen Pausen

const net = require('net');
const fs = require('fs');

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

function sendCommand(status) {
  return new Promise((resolve) => {
    const frame = buildFrame(status, motor.addrLow, motor.addrHigh);
    const sock = net.createConnection({ host: config.SPS1.host, port: config.SPS1.port });
    
    let responses = '';
    sock.on('data', (data) => {
      responses += data.toString('hex');
    });
    
    sock.write(frame);
    
    setTimeout(() => {
      sock.destroy();
      resolve(responses);
    }, 600);
  });
}

async function testShatten() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  BESCHATTUNGSFAHRT TEST                                ║');
  console.log('║  Test 1: RUNTER → 100ms → STOP                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('Sende RUNTER (0x02)...');
  const r1 = await sendCommand(0x02);
  console.log(`Response: ${r1}\n`);
  
  console.log('Warte 100ms...');
  await new Promise(r => setTimeout(r, 100));
  
  console.log('Sende STOP (0x03)...');
  const r2 = await sendCommand(0x03);
  console.log(`Response: ${r2}\n`);
  
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Test 2: RUNTER → 500ms → STOP\n');
  
  console.log('Sende RUNTER (0x02)...');
  const r3 = await sendCommand(0x02);
  console.log(`Response: ${r3}\n`);
  
  console.log('Warte 500ms...');
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Sende STOP (0x03)...');
  const r4 = await sendCommand(0x03);
  console.log(`Response: ${r4}\n`);
  
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Test 3: RUNTER → 1000ms → STOP\n');
  
  console.log('Sende RUNTER (0x02)...');
  const r5 = await sendCommand(0x02);
  console.log(`Response: ${r5}\n`);
  
  console.log('Warte 1000ms...');
  await new Promise(r => setTimeout(r, 1000));
  
  console.log('Sende STOP (0x03)...');
  const r6 = await sendCommand(0x03);
  console.log(`Response: ${r6}\n`);
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  ✓ Tests abgeschlossen                                ║');
  console.log('║  Beobachtung: Bei welcher Pause funktioniert Stopp?   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

testShatten().catch(console.error);
