# PLC Smart Home - Frontend App 📱

## Beschreibung

Basierend auf den 15 App-Screenshots aus der Anleitung.pdf (Seite 7) wurde ein interaktives HTML-Frontend erstellt, das die Benutzeroberfläche der **"PLC Smart Home" iPhone App** nachbildet.

## Features

### Bildschirme:

1. **🏠 Hauptmenu - Motorauswahl**
   - Liste aller 15 verfügbaren Jalousien/Motoren
   - Übersichtliche 2-spaltige Anordnung
   - Schnelle Auswahl durch Anklicken

2. **⚙️ Motor-Steuerung**
   - Motor-Name und Beschreibung
   - Aktueller Status anzeigen
   - Laufzeit-Information
   - 3 Bedienelemente:
     - **HOCH ⬆️** - Motor nach oben fahren
     - **RUNTER ⬇️** - Motor nach unten fahren
     - **STOP ⏹️** - Motor stoppen
   - Zurück-Button

3. **⚙️ Einstellungen**
   - SPS Stationen konfigurieren
   - Geräte verwalten
   - Gruppen einrichten
   - System-Informationen

4. **📊 Status-Übersicht**
   - Aktuelle Status aller Motoren
   - Farbcodierung (Grün = Ein/Oben, Orange = Aus/Unten)
   - Live-Statusanzeige

### Navigation:

Alle Bildschirme sind über die untere Navigationsleiste erreichbar:
- 🏠 **Home** - Zur Motorauswahl
- ⚙️ **Settings** - Einstellungen
- 📊 **Status** - Status-Übersicht

## Verwendung

### Lokal öffnen:

**Windows:**
```powershell
# Im Explorer nach der Datei navigieren
app-frontend.html doppelklicken

# Oder über Kommandozeile:
start app-frontend.html
```

**macOS/Linux:**
```bash
open app-frontend.html
```

### Online verfügbar machen:

Um die App lokal zu servieren (mit Node.js):

```bash
# Einfacher HTTP-Server:
npx http-server

# Dann im Browser öffnen:
http://localhost:8080/app-frontend.html
```

## Technische Details

### Technologie:
- HTML5
- CSS3 (Modern Flexbox & Grid)
- Vanilla JavaScript (keine Frameworks)
- Responsive Design

### Dateistruktur:
```
app-frontend.html          # Komplette Single-Page-App
  ├─ HTML (5 Bildschirme)
  ├─ CSS (Styling & Animationen)
  └─ JavaScript (Navigation & Interaktivität)
```

### Browser-Kompatibilität:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Browser (iOS Safari, Chrome Mobile)

## Quelle

Die App basiert auf den **15 Original-App-Screenshots** aus:
- **Datei:** Anleitung.pdf
- **Seite:** 7
- **Bilder:** 15 Bildschirmfotos der "PLC Smart Home" iPhone App

## Integration

Diese Frontend-App kann erweitert werden, um mit dem Node.js Backend zu kommunizieren:

```javascript
// Beispiel: API-Aufruf zum steuern eines Motors
async function motorAction(action) {
    const response = await fetch('http://localhost:3000/motor/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motor: motorName, action: action })
    });
    
    const result = await response.json();
    console.log(result);
}
```

## Verwandte Dateien

- `motor-control.js` - Node.js CLI für Motor-Steuerung
- `motor-control-interactive.js` - Interaktives Steuerung-Tool (Terminal)
- `FINAL_SESSIONS_32-34_ANALYSIS.md` - Protokoll-Dokumentation
- `STATUS_QUERY_INTEGRATION.md` - Status-Query-Integration

## Weitere Entwicklung

Mögliche Erweiterungen:
- [ ] Echtzeit-Statusaktualisierung (WebSockets)
- [ ] Motor-Zeitprogramme erstellen/bearbeiten
- [ ] Gruppenbefehle (mehrere Motoren zusammen)
- [ ] Automatiken (Sonnen-, Zeit-, Regen-, Windautomatik)
- [ ] Authentifizierung (PIN/Passwort)
- [ ] Dark Mode
- [ ] Mehrsprachig (EN, DE, FR)

## Screenshots der App

Die Original-App-Screenshots sind in dieser Datei als Referenz verfügbar:
```
app-screenshots/seite-7-mit-app-screenshots.png
```

Dies zeigt alle 15 Bildschirme in einer Übersicht aus dem offiziellen Handbuch.
