@echo off
chcp 65001 >nul
pushd "%~dp0"
echo.
echo ==========================================
echo Testing Node.js...
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js first.
    pause
    exit /b 1
)

echo Node.js found:
node --version
echo.

echo ==========================================
echo Testing npm...
echo ==========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)

echo npm found:
npm --version
echo.

echo ==========================================
echo Starting development server...
echo ==========================================
echo.
echo Access URLs:
echo   PC: http://localhost:3000
echo   Mobile: http://192.168.0.81:3000
echo.
echo Press Ctrl+C to stop
echo ==========================================
echo.

npm run dev

if errorlevel 1 (
    echo.
    echo ==========================================
    echo ERROR: Server failed to start!
    echo ==========================================
    pause
)
