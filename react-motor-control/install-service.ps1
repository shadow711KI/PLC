# Install Motor Control as Windows Service
# Muss als Administrator ausgefuehrt werden!

Write-Host "=== Motor Control - Windows Service Installation ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "FEHLER: Dieses Script muss als Administrator ausgefuehrt werden!" -ForegroundColor Red
    Write-Host "Rechtsklick -> Als Administrator ausfuehren" -ForegroundColor Yellow
    pause
    exit 1
}

# Pruefe ob PM2 installiert ist
Write-Host "Pruefe PM2 Installation..." -ForegroundColor Yellow
try {
    $pm2Version = & npx pm2 -v 2>&1
    Write-Host "PM2 Version: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "PM2 nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Build Frontend
Write-Host ""
Write-Host "Building Frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fehlgeschlagen!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Frontend gebaut" -ForegroundColor Green

# Erstelle Logs Verzeichnis
Write-Host ""
Write-Host "Erstelle Logs Verzeichnis..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
Write-Host "Logs Verzeichnis erstellt" -ForegroundColor Green

# Starte PM2
Write-Host ""
Write-Host "Starte Services mit PM2..." -ForegroundColor Yellow
npx pm2 start ecosystem.config.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "PM2 Start fehlgeschlagen!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "Services gestartet" -ForegroundColor Green

# Speichere PM2 Prozesse
Write-Host ""
Write-Host "Speichere PM2 Konfiguration..." -ForegroundColor Yellow
npx pm2 save
Write-Host "Konfiguration gespeichert" -ForegroundColor Green

# Installiere Windows Service
Write-Host ""
Write-Host "Installiere Windows Startup..." -ForegroundColor Yellow
npx pm2 startup
Write-Host ""
Write-Host "WICHTIG: Fuehre den oben angezeigten Befehl aus!" -ForegroundColor Yellow
Write-Host ""

# Zeige Status
Write-Host ""
Write-Host "=== Installation abgeschlossen! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Services laufen unter:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Netzwerk-Zugriff:" -ForegroundColor Cyan
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -like "192.168.*" }).IPAddress | Select-Object -First 1
Write-Host "  iPhone: http://${ip}:3000" -ForegroundColor White
Write-Host ""
Write-Host "Befehle:" -ForegroundColor Cyan
Write-Host "  Status:   npx pm2 status" -ForegroundColor White
Write-Host "  Logs:     npx pm2 logs" -ForegroundColor White
Write-Host "  Stopp:    npx pm2 stop all" -ForegroundColor White
Write-Host "  Neustart: npx pm2 restart all" -ForegroundColor White
Write-Host ""
npx pm2 status

pause
