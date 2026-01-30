@echo off
chcp 65001 >nul
pushd "%~dp0"

echo.
echo ==========================================
echo Ashtanga App - Development Server
echo ==========================================
echo.
echo Starting...
echo.

cmd /k npm run dev
