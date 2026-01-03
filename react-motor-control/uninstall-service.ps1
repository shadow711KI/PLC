# Uninstall Motor Control Windows Service
# Muss als Administrator ausgeführt werden!

Write-Host "=== Motor Control - Service Deinstallation ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ FEHLER: Dieses Script muss als Administrator ausgeführt werden!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Stoppe alle PM2 Prozesse..." -ForegroundColor Yellow
npx pm2 stop all

Write-Host "Lösche PM2 Prozesse..." -ForegroundColor Yellow
npx pm2 delete all

Write-Host "Entferne Windows Startup..." -ForegroundColor Yellow
npx pm2 unstartup

Write-Host ""
Write-Host "✓ Service deinstalliert!" -ForegroundColor Green
Write-Host ""

pause
