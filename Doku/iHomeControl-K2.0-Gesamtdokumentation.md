# iHomeControl K2.0 – Gesamtdokumentation (Adressen + Befehle)

## Inhaltsverzeichnis
- [iHomeControl K2.0 – Gesamtdokumentation (Adressen + Befehle)](#ihomecontrol-k2.0--gesamtdokumentation-(adressen--befehle))
  - [Teil 1 – Adressen (vollständiger Originalinhalt)](#teil-1--adressen-(vollständiger-originalinhalt))
- [Adressen – iHomeControl K2.0 (vollständig strukturiert)](#adressen--ihomecontrol-k2.0-(vollständig-strukturiert))
  - [1. Adressmatrix: Motoren & Zeitschaltpunkte](#1.-adressmatrix-motoren--zeitschaltpunkte)
    - [1.1 Motoradressen (Laufzeiten/Positionen/Zeitschaltpunkte)](#1.1-motoradressen-(laufzeitenpositionenzeitschaltpunkte))
  - [2. Befehlsadressen (fahre/Position/Reserve)](#2.-befehlsadressen-(fahrepositionreserve))
  - [3. Operandencodes & Sonderfunktionen](#3.-operandencodes--sonderfunktionen)
    - [3.1 Operandencode 69 (Wort-Übertragung) – 99 Adressen (Adresse 0 nicht zuweisbar)](#3.1-operandencode-69-(wort-übertragung)--99-adressen-(adresse-0-nicht-zuweisbar))
    - [3.2 Operandencode 48 (Byte-Übertragung) – 99 Adressen (Adresse 0 nicht zuweisbar)](#3.2-operandencode-48-(byte-übertragung)--99-adressen-(adresse-0-nicht-zuweisbar))
  - [Teil 2 – Befehle (vollständiger Originalinhalt)](#teil-2--befehle-(vollständiger-originalinhalt))
- [Befehle – iHomeControl K2.0 (vollständig strukturiert mit Beispielen)](#befehle--ihomecontrol-k2.0-(vollständig-strukturiert-mit-beispielen))
  - [1. Telegramm-Grundlagen](#1.-telegramm-grundlagen)
  - [2. Einzelmotor-Steuerbefehle (Beispiel: Motor 1)](#2.-einzelmotor-steuerbefehle-(beispiel-motor-1))
    - [2.1 „fahre hoch“](#2.1-fahre-hoch)
    - [2.2 „fahre runter“](#2.2-fahre-runter)
    - [2.3 „Beschattungsfahrt“ (Sequenz)](#2.3-beschattungsfahrt-(sequenz))
    - [2.4 „stop“ (kombinierter Stopp)](#2.4-stop-(kombinierter-stopp))
  - [3. Zustände auslesen](#3.-zustände-auslesen)
    - [3.1 Alle Motorpositionen einer Station](#3.1-alle-motorpositionen-einer-station)
    - [3.2 Motorlauf-/Wende-/Antippzeiten auslesen](#3.2-motorlauf-wende-antippzeiten-auslesen)
  - [4. Parameter schreiben](#4.-parameter-schreiben)
    - [4.1 Motorlauf-/Wende-/Antippzeiten setzen](#4.1-motorlauf-wende-antippzeiten-setzen)
  - [5. Automatikfunktionen](#5.-automatikfunktionen)
    - [5.1 Automatik je Motor – lesen](#5.1-automatik-je-motor--lesen)
    - [5.2 Automatik je Motor – schreiben](#5.2-automatik-je-motor--schreiben)
    - [5.3 Zeitautomatik B10 (Station)](#5.3-zeitautomatik-b10-(station))
    - [5.4 Beschattungsautomatik (Station)](#5.4-beschattungsautomatik-(station))
    - [5.5 Dämmerungsautomatik (Station)](#5.5-dämmerungsautomatik-(station))
    - [5.6 Zeitautomatik B1–B6 (je Motor)](#5.6-zeitautomatik-b1b6-(je-motor))
    - [5.7 Automatiken & Wetterdaten auslesen](#5.7-automatiken--wetterdaten-auslesen)
  - [6. Kombinierte Abfrage (Motorpositionen + Wetter + Automatiken)](#6.-kombinierte-abfrage-(motorpositionen--wetter--automatiken))
  - [7. Gruppenansteuerung (Motor 1 & 2)](#7.-gruppenansteuerung-(motor-1--2))
    - [7.1 „fahre hoch“](#7.1-fahre-hoch)
    - [7.2 „fahre runter“](#7.2-fahre-runter)
    - [7.3 „Beschattungsfahrt“](#7.3-beschattungsfahrt)
    - [7.4 „stop“](#7.4-stop)
  - [8. Zeitschaltpunkte](#8.-zeitschaltpunkte)
    - [8.1 Bitmuster-Beispiel: 19:38 Uhr EIN (Hochfahrt)](#8.1-bitmuster-beispiel-1938-uhr-ein-(hochfahrt))
    - [8.2 Schaltzeitpunkt 1 von Motor 1 auslesen](#8.2-schaltzeitpunkt-1-von-motor-1-auslesen)
    - [8.3 Schaltzeitpunkt 1 an Motor 1 schreiben (14:38 Uhr EIN)](#8.3-schaltzeitpunkt-1-an-motor-1-schreiben-(1438-uhr-ein))
    - [8.4 Schaltzeitpunkte 1–6 an Motor 1 schreiben](#8.4-schaltzeitpunkte-16-an-motor-1-schreiben)
    - [8.5 Schaltzeitpunkte 1–6 von Motor 1 auslesen](#8.5-schaltzeitpunkte-16-von-motor-1-auslesen)
  - [9. Datum & Uhrzeit](#9.-datum--uhrzeit)
    - [9.1 Beispielübertragung: 30.05.2012, 10:11 Uhr](#9.1-beispielübertragung-30.05.2012-1011-uhr)

---

# iHomeControl K2.0 – Gesamtdokumentation (Adressen + Befehle)

Dieses Dokument vereint **alle Inhalte** aus den gelieferten Dateien *Adressen-full.md* und *Befehle-full.md* – unverändert und vollständig.

---

## Teil 1 – Adressen (vollständiger Originalinhalt)

# Adressen – iHomeControl K2.0 (vollständig strukturiert)

Dieses Dokument ist die bereinigte, strukturierte Wiedergabe der Inhalte aus **Adressen-iHomeControl-K2-0.pdf**.

---

## 1. Adressmatrix: Motoren & Zeitschaltpunkte

### 1.1 Motoradressen (Laufzeiten/Positionen/Zeitschaltpunkte)
| Funktion            | Motor 1 | Motor 2 | Motor 3 | Motor 4 | Motor 5 | Motor 6 |
|---------------------|---------|---------|---------|---------|---------|---------|
| Laufzeit hoch       | 1       | 17      | 33      | 49      | 65      | 81      |
| Laufzeit runter     | 2       | 18      | 34      | 50      | 66      | 82      |
| Position 3          | 3       | 19      | 35      | 51      | 67      | 83      |
| Position 4          | 4       | 20      | 36      | 52      | 68      | 84      |
| Position 5          | 5       | 21      | 37      | 53      | 69      | 85      |
| Position 6          | 6       | 22      | 38      | 54      | 70      | 86      |
| Zeitschaltpunkt 1   | 7       | 23      | 39      | 55      | 71      | 87      |
| Zeitschaltpunkt 2   | 8       | 24      | 40      | 56      | 72      | 88      |
| Zeitschaltpunkt 3   | 9       | 25      | 41      | 57      | 73      | 89      |
| Zeitschaltpunkt 4   | 10 / A  | 26 / 1A | 42 / 2A | 58 / 3A | 74 / 4A | 90 / 5A |
| Zeitschaltpunkt 5   | 11 / B  | 27 / 1B | 43 / 2B | 59 / 3B | 75 / 4B | 91 / 5B |
| Zeitschaltpunkt 6   | 12 / C  | 28 / 1C | 44 / 2C | 60 / 3C | 76 / 4C | 92 / 5C |
| Position D          | 13 / D  | 29 / 1D | 45 / 2D | 61 / 3D | 77 / 4D | 93 / 5D |
| Position E          | 14 / E  | 30 / 1E | 46 / 2E | 62 / 3E | 78 / 4E | 94 / 5E |
| Beschattung (F)     | 15 / F  | 31 / 1F | 47 / 2F | 63 / 3F | 79 / 4F | 95 / 5F |

---

## 2. Befehlsadressen (fahre/Position/Reserve)

| Funktion        | Motor 1 | Motor 2 | Motor 3 | Motor 4 | Motor 5 | Motor 6 |
|-----------------|---------|---------|---------|---------|---------|---------|
| fahre hoch      | 1       | 17      | 33      | 49      | 65      | 81      |
| fahre runter    | 2       | 18      | 34      | 50      | 66      | 82      |
| Position oben   | 3       | 19      | 35      | 51      | 67      | 83      |
| Position unten  | 4       | 20      | 36      | 52      | 68      | 84      |
| Reserve         | 5       | 21      | 37      | 53      | 69      | 85      |
| Reserve         | 6       | 22      | 38      | 54      | 70      | 86      |
| Reserve         | 7       | 23      | 39      | 55      | 71      | 87      |
| Reserve         | 8       | 24      | 40      | 56      | 72      | 88      |
| Reserve         | 9       | 25      | 41      | 57      | 73      | 89      |
| Reserve         | 10 / A  | 26 / 1A | 42 / 2A | 58 / 3A | 74 / 4A | 90 / 5A |
| Reserve         | 11 / B  | 27 / 1B | 43 / 2B | 59 / 3B | 75 / 4B | 91 / 5B |
| Reserve         | 12 / C  | 28 / 1C | 44 / 2C | 60 / 3C | 76 / 4C | 92 / 5C |
| Reserve         | 13 / D  | 29 / 1D | 45 / 2D | 61 / 3D | 77 / 4D | 93 / 5D |
| Reserve         | 14 / E  | 30 / 1E | 46 / 2E | 62 / 3E | 78 / 4E | 94 / 5E |
| Reserve         | 15 / F  | 31 / 1F | 47 / 2F | 63 / 3F | 79 / 4F | 95 / 5F |

---

## 3. Operandencodes & Sonderfunktionen

### 3.1 Operandencode 69 (Wort-Übertragung) – 99 Adressen (Adresse 0 nicht zuweisbar)
- Zeitschaltpunkt 1
- Zeitschaltpunkt 2
- Zeitschaltpunkt 3
- Zeitschaltpunkt 4
- SPS Kennung 1
- SPS Kennung 2
- Alle Motoren (Schaltuhr B10)
- Automatik für ganze Station
- Automatik Zeit B10
- Automatik Beschattung
- Antippzeit hoch
- Dämmerungswert
- Antippzeit runter
- Automatik Zeit B1–6
- Wendezeit
- Automatik Ein/Aus
- Motor stop

### 3.2 Operandencode 48 (Byte-Übertragung) – 99 Adressen (Adresse 0 nicht zuweisbar)
- Sonne abfragen
- Wind abfragen
- Dämmerung abfragen
- Wetterzustand einer SPS-Station

---

*Quelle: Adressen-iHomeControl-K2-0.pdf*


---

## Teil 2 – Befehle (vollständiger Originalinhalt)

# Befehle – iHomeControl K2.0 (vollständig strukturiert mit Beispielen)

Bereinigte, strukturierte Darstellung der Inhalte aus **Befehle-iHomeControl-K2-0.pdf** inklusive Telegrammbeispielen, Gruppenansteuerung, Zeitschaltpunkten und Datum/Uhrzeit.

---

## 1. Telegramm-Grundlagen

- **STX/ETX**: Start/Ende des Telegramms
- **Nutzdatenbytes**: Anzahl der Bytes von „Typ A/B“ bis ein Byte vor ETX
- **Operandenanzahl/-code**: Zahl der Operanden und deren Code (z. B. 48/69)
- **Adresse (low/high)**: Zieladresse je Operand
- **Wert (low/high)**: Datenwerte je Operand
- **Status**: Statusfeld
- **Prüfsumme**: Summe aller Bytes von „Typ A/B“ bis ein Byte vor ETX (Low/High)

---

## 2. Einzelmotor-Steuerbefehle (Beispiel: Motor 1)

### 2.1 „fahre hoch“
```text
Hex: 02 08 41 00 01 01 48 01 00 01 03 8D 00
Dez: 65 0 1 1 72 1 0 1 141
Hinweis: Werte mit farbigem Hintergrund müssen berechnet werden (siehe Adressenliste).
```

### 2.2 „fahre runter“
```text
Hex: 02 08 41 00 01 01 48 02 00 01 03 8E 00
Dez: 65 0 1 1 72 2 0 1 142
```

### 2.3 „Beschattungsfahrt“ (Sequenz)
```text
1) Fahrbefehl (wie „fahre runter“), dann ~0,1 s Pause
2) Hex: 02 09 41 00 01 01 69 0F 00 00 00 03 BB 00 BB
Dez: 65 0 1 1 105 15 0 0 0 3 187
```

### 2.4 „stop“ (kombinierter Stopp)
```text
Hex: 02 16 41 00 01 04 69 0D 00 30 75 69 0E 00 30 75 48 03 00 00 48 04 00 00 03 14 03
Dez: 65 0 1 4 105 13 0 48 117 105 14 0 48 117 72 3 0 0 72 4 0 0 3 788
```

---

## 3. Zustände auslesen

### 3.1 Alle Motorpositionen einer Station
```text
Anfrage (Hex):
02 28 41 00 00 0C
48 03 00  48 04 00  48 13 00  48 14 00  48 23 00  48 24 00
48 33 00  48 34 00  48 43 00  48 44 00  48 53 00  48 54 00
03 B7 05
```

**Beispiel-Antwort (alle Motoren in Beschattung):**
```text
02 03 40 00 21
02 10 41 00 00 0C
01 00  01 01  01 01  01 01  01 01  01 01
03 59 00 00
```

### 3.2 Motorlauf-/Wende-/Antippzeiten auslesen
```text
Hex: 02 13 41 00 00 05 69 01 00 69 02 00 69 05 00 69 03 00 69 04 00 03 62 02
Dez: 65 0 0 5 105 1 0 105 2 0 105 5 0 105 3 0 105 4 0 3 610
```

**Beispiel-Antwort:**
```text
02 03 40 00 21
02 0E 41 00 00 05
57 02  58 02  07 00  09 00  0A 00
03 13 01
```

---

## 4. Parameter schreiben

### 4.1 Motorlauf-/Wende-/Antippzeiten setzen
```text
Hex:
02 1D 41 00 01 05
69 01 00  57 02
69 02 00  58 02
69 05 00  00 07 00
69 03 00  09 00
69 04 00  0A 00
03 30 03
```

---

## 5. Automatikfunktionen

> **Achtung:** Automatik je Motor (69 06) ist **umgekehrt**: `00 = AN`, `01 = AUS`.

### 5.1 Automatik je Motor – lesen
```text
Anfrage:
02 07 41 00 00 01 69 06 00 03 B1 00
Antwort:
02 03 40 00 21
02 06 41 00 00 01
01 00
03 43 00
```

### 5.2 Automatik je Motor – schreiben
```text
02 09 41 00 01 01 69 06 00 01 00 03 B3 00
Logik: 00 = AN, 01 = AUS
```

### 5.3 Zeitautomatik B10 (Station)
```text
02 09 41 00 01 01 69 61 00 01 00 03 BC 00
Zustände: 01 = AN, 00 = AUS, 02 = Zufallsautomatik
```

### 5.4 Beschattungsautomatik (Station)
```text
02 09 41 00 01 01 69 62 00 01 00 03 103 00
Zustände: 01 = AN, 00 = AUS
```

### 5.5 Dämmerungsautomatik (Station)
```text
02 09 41 00 01 01 69 63 00 01 00 03 FE 00
Zustände: 01 = AN, 00 = AUS
```

### 5.6 Zeitautomatik B1–B6 (je Motor)
```text
02 09 41 00 01 01 69 64 00 01 00 03 147 00
```

### 5.7 Automatiken & Wetterdaten auslesen
```text
02 19 41 00 00 07
69 61 00  69 62 00  69 63 00  69 64 00
48 10 00  48 20 00  48 30 00
03 AE 04
```

---

## 6. Kombinierte Abfrage (Motorpositionen + Wetter + Automatiken)
```text
02 43 41 00 00 15
48 03 00  48 04 00  48 13 00  48 14 00  48 23 00  48 24 00
48 33 00  48 34 00  48 43 00  48 44 00  48 53 00  48 54 00
69 06 00  69 16 00  69 26 00  69 36 00  69 46 00  69 56 00
48 10 00  48 20 00  48 30 00
03 82 0A
```

**Beispiel-Antwort (Auszug):**
```text
02 03 40 00 21
02 1F 41 00 00 15
00 01 01 01 01 01 01 01 01 01 01
son win däm: 01 00 00
03 62 00
```

---

## 7. Gruppenansteuerung (Motor 1 & 2)

### 7.1 „fahre hoch“
```text
02 0C 41 00 01 02
48 01 00 01   48 11 00 01
03 E8 00
```

### 7.2 „fahre runter“
```text
02 0C 41 00 01 02
48 02 00 01   48 12 00 01
03 EA 00
```

### 7.3 „Beschattungsfahrt“
```text
02 0E 41 00 01 02
69 0F 00 00 00   69 1F 00 00 00
03 44 01
```

### 7.4 „stop“
```text
02 28 41 00 01 08
69 0D 00 30 75   69 0E 00 30 75
48 03 00 00      48 04 00 00
69 1D 00 30 75   69 1E 00 30 75
48 13 00 00      48 14 00 00
03 26 06
```

---

## 8. Zeitschaltpunkte

### 8.1 Bitmuster-Beispiel: 19:38 Uhr EIN (Hochfahrt)
```text
Wochentage (Byte 1, Bits So..Sa): 0111110
Stunde 19: Dez 19 / Hex 13 / Bin 10011
Minute 38: Dez 38 / Hex 26 / Bin 100110
Bytefolge (Beispiel im PDF): 80 FF F9 CD
Ein/Aus: 1 = EIN, 0 = AUS
```

### 8.2 Schaltzeitpunkt 1 von Motor 1 auslesen
```text
Anfrage:
02 07 41 00 00 01 69 07 00 03 B2 00
Antwort:
02 03 40 00 21
02 08 41 00 00 01
80 FF F9 CD
03 87 03
```

### 8.3 Schaltzeitpunkt 1 an Motor 1 schreiben (14:38 Uhr EIN)
```text
02 0B 41 00 01 01
69 07 00
80 FF F9 CD
03 F8 03
```

### 8.4 Schaltzeitpunkte 1–6 an Motor 1 schreiben
```text
02 2E 41 00 01 06
69 07 00 80 FF F9 CD
69 08 00 80 FF F9 CD
69 09 00 80 FF F9 CD
69 0A 00 80 FF F9 CD
69 0B 00 80 FF F9 CD
69 0C 00 80 FF F9 CD
03 95 16
```

### 8.5 Schaltzeitpunkte 1–6 von Motor 1 auslesen
```text
Anfrage:
02 16 41 00 00 06
69 07 00  69 08 00  69 09 00  69 0A 00  69 0B 00  69 0C 00
03 F6 02
Antwort:
02 03 40 00 21
02 1C 41 00 00 06
80 FF F9 CD (×6)
03 E5 13
```

---

## 9. Datum & Uhrzeit

### 9.1 Beispielübertragung: 30.05.2012, 10:11 Uhr
```text
Hex:
02 0B 41 00 21
DC 07 05 1E 0A 0B 00 00
03 7D 01

Dez:
65 0 33 220 7 5 30 10 11 0 0 3 381
Hinweis: Jahr 2012 = 0x7DC
```

---

*Quelle: Befehle-iHomeControl-K2-0.pdf*
