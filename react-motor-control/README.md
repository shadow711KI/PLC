# PLC Smart Home - React Frontend

Modernes React Frontend für die Steuerung von 15 Jalousien/Motoren über SPS-Stationen.

## 🚀 Installation

```bash
cd react-motor-control
npm install
```

## 💻 Entwicklung

```bash
npm run dev
```

Öffnet automatisch http://localhost:3000

## 📦 Build

```bash
npm run build
```

## ✨ Features

- ✅ React 18 + TypeScript
- ✅ Vite Build-Tool
- ✅ 15 Motor-Steuerungen
- ✅ Status-Übersicht
- ✅ Einstellungen-Panel
- ✅ Responsive Design
- ✅ Modern UI/UX

## 🏗️ Projekt-Struktur

```
src/
├── components/
│   ├── MotorList.tsx      # Motorauswahl
│   ├── MotorControl.tsx   # Motor-Steuerung
│   ├── Settings.tsx       # Einstellungen
│   ├── Status.tsx         # Status-Übersicht
│   └── Navigation.tsx     # Navigation
├── App.tsx                # Hauptkomponente
└── main.tsx              # Entry Point
```

## 🎨 Komponenten

### MotorList
Liste aller 15 verfügbaren Motoren

### MotorControl
Steuerung einzelner Motoren (HOCH/RUNTER/STOP)

### Settings
SPS-Stationen und Geräteverwaltung

### Status
Live-Status aller Motoren

### Navigation
Tab-Navigation zwischen Screens
