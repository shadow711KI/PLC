@echo off
echo ========================================
echo Motor Control - Starte Server
echo ========================================
echo.

echo [1/3] Beende laufende Server...
REM Beende PowerShell-Prozesse, die npm run server oder npm run dev ausfuehren (Fenster schliesst automatisch)
powershell -NoLogo -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'powershell.exe' -and ($_.CommandLine -like '*npm run server*' -or $_.CommandLine -like '*npm run dev*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
REM Beende alle node.exe und tsx Prozesse
taskkill /F /IM node.exe 2>nul
taskkill /F /IM tsx.exe 2>nul
REM Warte kurz
timeout /t 1 /nobreak >nul

echo.
echo [2/3] Starte Backend-Server (Port 3001)...
start "Backend Server" powershell -NoExit -Command "cd '%~dp0'; Write-Host '=== Backend Server ===' -ForegroundColor Green; npm run server"
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starte Frontend-Server (Port 5173)...
start "Frontend Server" powershell -NoExit -Command "cd '%~dp0'; Write-Host '=== Frontend Server ===' -ForegroundColor Cyan; npm run dev"

echo.
echo ========================================
echo Server werden gestartet...
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo ========================================
echo.
exit
