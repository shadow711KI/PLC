
// [PRODUKTIV] Backend-API für Motorsteuerung
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// Motor-Konfiguration laden
app.get('/api/motors/config', (req, res) => {
  try {
    const motorConfigPath = path.join(__dirname, 'react-motor-control', 'motor-config.json');
    const motorConfig = JSON.parse(fs.readFileSync(motorConfigPath, 'utf8'));
    res.json(motorConfig);
  } catch (error) {
    console.error('Fehler beim Laden der Motor-Konfiguration:', error);
    res.status(500).json({ error: 'Motor-Konfiguration konnte nicht geladen werden' });
  }
});

// Raum-Konfiguration laden
app.get('/api/rooms/config', (req, res) => {
  try {
    const roomConfigPath = path.join(__dirname, 'react-motor-control', 'room-config.json');
    const roomConfig = JSON.parse(fs.readFileSync(roomConfigPath, 'utf8'));
    res.json(roomConfig);
  } catch (error) {
    console.error('Fehler beim Laden der Raum-Konfiguration:', error);
    res.status(500).json({ error: 'Raum-Konfiguration konnte nicht geladen werden' });
  }
});

// Raum-Reihenfolge speichern
app.post('/api/rooms/order', (req, res) => {
  try {
    const roomConfigPath = path.join(__dirname, 'react-motor-control', 'room-config.json');
    const roomConfig = JSON.parse(fs.readFileSync(roomConfigPath, 'utf8'));
    roomConfig.order = req.body.order;
    fs.writeFileSync(roomConfigPath, JSON.stringify(roomConfig, null, 2), 'utf8');
    console.log('Raum-Reihenfolge gespeichert:', req.body.order);
    res.json({ success: true, message: 'Raum-Reihenfolge gespeichert' });
  } catch (error) {
    console.error('Fehler beim Speichern der Raum-Reihenfolge:', error);
    res.status(500).json({ error: 'Raum-Reihenfolge konnte nicht gespeichert werden' });
  }
});

// Motor control endpoint
app.post('/api/motor/control', (req, res) => {
  console.log('Motor control request:', req.body);
  res.json({ success: true, message: 'Motor command received', data: req.body });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
