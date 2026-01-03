# Status-Query Integration - Abgeschlossen ✅

## Was wurde integriert

Die Status-Query-Funktionen aus den Sessions #32-34 wurden in das interaktive Motor-Steuertool integriert.

### Neue Funktionen in motor-control-interactive.js

#### 1. buildStatusQueryFrame()
Erstellt einen 24-byte Status-Query Frame mit konfigurierbarem Operand-Offset
```javascript
buildStatusQueryFrame(motorIds = [1, 2, 3, 4, 5], operandOffset = 0x50)
```

#### 2. queryMotorStatus()
Sendet Status-Query an SPS und empfängt Antwort (non-blocking, 800ms Timeout)
```javascript
queryMotorStatus(motorNr, host, port)
```

#### 3. parseStatusResponse()
Dekodiert die 24-byte Antwort von der SPS
```javascript
parseStatusResponse(buffer)
```

### Funktionsweise

Vor jedem Motor-Befehl wird automatisch der aktuelle Status abgefragt:

```
🔍 Prüfe Status von Arbeiten...
   Status: OK | Hex: 0203400021020e410000...
   
📡 Sende Befehl: SPS3 → Arbeiten [RUNTER]
✅ Motor antwortet - ERFOLG!
```

### Implementierungsdetails

- **Non-blocking:** Status-Abfrage blockiert nicht die Benutzerinteraktion
- **Timeout:** 800ms maximum Wartezeit pro Status-Abfrage
- **Fehlerbehandlung:** Bei Verbindungsfehler oder Timeout wird Ausgabe "Status: Konnte nicht abgefragt werden" angezeigt
- **Async Promise:** Status-Abfrage erfolgt asynchron im Hintergrund

### Test-Dateien

1. **test-status-integration.js** - Standalone Test der Status-Query-Funktionen
   ```bash
   node test-status-integration.js
   ```

### Verwendung

Das Tool funktioniert wie bisher - nur mit zusätzlicher Status-Anzeige:

```bash
node motor-control-interactive.js
```

Auswahl:
1. Motor aus Liste auswählen (1-15)
2. Befehl auswählen (HOCH/RUNTER/STOP)
3. Status wird abgefragt und Motor-Befehl gesendet

### Beispiel-Ausgabe

```
╔════════════════════════════════════════════════════╗
║       🎛️  MOTOR STEUERUNG - INTERAKTIV             ║
╚════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────┐
│         MOTOR AUSWÄHLEN (1-15)                 │
└────────────────────────────────────────────────────┘

  1. Wohnen_Ost
  2. Wohnen_Sued_links
  ...
  6. Arbeiten
  ...

➜ Motor Nummer eingeben (1-15) oder "exit": 6

┌────────────────────────────────────────────────────┐
│         BEFEHL AUSWÄHLEN (1-3)                     │
└────────────────────────────────────────────────────┘

  1. HOCH ⬆️
  2. RUNTER ⬇️
  3. STOP ⏹️

➜ Befehl eingeben (1-3): 2

🔍 Prüfe Status von Arbeiten...
   Status: OK | Hex: 0203400021020e410000...
   
📡 Sende Befehl: SPS3 → Arbeiten [RUNTER]
✅ Motor antwortet - ERFOLG!
```

## Technischer Hintergrund

Die Status-Queries (Sessions #32-34) sind dokumentierte Befehle aus dem iHomeControl-K2 Protokoll zur gleichzeitigen Abfrage mehrerer Motor-Status.

**Frame-Struktur:**
```
02 13 41 00 00 05 69 51 00 69 52 00 69 53 00 69 54 00 69 55 00 03 F2 03
```

- STX: 0x02
- LEN: 0x13 (19 bytes payload)
- TYPE: 0x41 (Status Query)
- OPERAND OFFSET: 0x50 (Motors 1-5 mit 0x50 Offset)
- Response: 24-byte mit Motor-Status-Daten

Weitere Details siehe [FINAL_SESSIONS_32-34_ANALYSIS.md](FINAL_SESSIONS_32-34_ANALYSIS.md)
