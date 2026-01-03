# Motor Control - Installation & Nutzung

## 🚀 Als Windows-Dienst installieren

**1. PowerShell als Administrator öffnen**
- Windows-Taste drücken
- "PowerShell" eingeben
- Rechtsklick → "Als Administrator ausführen"

**2. Installation ausführen**
```powershell
cd "c:\Users\DirkTeschner\OneDrive - Beratung\privat\software\rjapp\react-motor-control"
.\install-service.ps1
```

**3. Firewall-Regel erstellen (falls nötig)**
```powershell
New-NetFirewallRule -DisplayName "Motor Control Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Motor Control Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

## 📱 Auf iPhone installieren

**1. Deine PC IP-Adresse finden**
```powershell
ipconfig
# Suche nach "IPv4-Adresse" (z.B. 192.168.178.x)
```

**2. Auf iPhone**
- Safari öffnen
- Gehe zu: `http://[DEINE-IP]:3000` (z.B. http://192.168.178.50:3000)
- Teilen-Button tippen (Quadrat mit Pfeil)
- "Zum Home-Bildschirm" wählen
- Name bestätigen
- ✓ App ist installiert!

## 🔧 Verwaltung

**Status prüfen:**
```powershell
npx pm2 status
```

**Logs anzeigen:**
```powershell
npx pm2 logs
```

**Neustart:**
```powershell
npx pm2 restart all
```

**Stoppen:**
```powershell
npx pm2 stop all
```

**Deinstallieren:**
```powershell
.\uninstall-service.ps1
```

## 🌐 URLs

- **Frontend (für iPhone):** `http://[PC-IP]:3000`
- **Backend API:** `http://[PC-IP]:3001`
- **Lokal:** `http://localhost:3000`

## 💡 Wichtig

- PC muss im gleichen WLAN sein wie iPhone
- PC muss eingeschaltet sein
- Services starten automatisch beim Windows-Start
- Läuft im Hintergrund (kein sichtbares Fenster)

## 🐛 Probleme?

**App lädt nicht:**
1. Firewall-Regeln prüfen
2. `npx pm2 status` → beide Services müssen "online" sein
3. IP-Adresse korrekt?

**Motor reagiert nicht:**
1. Backend-Logs prüfen: `npx pm2 logs motor-backend`
2. SPS-Adressen in `server/index.ts` korrekt?
3. Netzwerkverbindung zu SPS prüfen
