@echo off
echo ========================================
echo Motor Control - Stoppe alle Server
echo ========================================
echo.

powershell -Command "Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host 'Beende Prozess auf Port' $_.LocalPort; Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo.
echo Alle Server wurden gestoppt.
echo.
pause
