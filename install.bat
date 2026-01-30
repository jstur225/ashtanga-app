@echo off
chcp 65001 >nul
pushd "%~dp0"
echo.
echo ==========================================
echo Installing dependencies...
echo ==========================================
echo.
echo This may take a few minutes...
echo.

npm install

if errorlevel 1 (
    echo.
    echo ==========================================
    echo ERROR: Installation failed!
    echo ==========================================
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Installation completed!
echo ==========================================
echo.
echo You can now run: start-server.bat
echo.
pause
