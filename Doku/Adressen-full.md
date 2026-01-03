
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
