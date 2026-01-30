@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo Ashtanga App - Mobile Test
echo ==========================================
echo.
echo Starting development server...
echo.
echo [Access]
echo PC: http://localhost:3000
echo Mobile: http://192.168.0.81:3000
echo.
echo [Important]
echo 1. Same WiFi for PC and mobile
echo 2. Allow firewall if prompted
echo 3. Press Ctrl+C to stop
echo.
echo ==========================================
echo.

npm run dev
pause
