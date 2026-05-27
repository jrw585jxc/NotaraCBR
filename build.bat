@echo off
title NotaraCBR Build
:: Dark background (0), warm yellow/amber text (6) — matches NotaraCBR accent
color 06
mode con: cols=60 lines=32

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║           NotaraCBR  Build               ║
echo   ╚══════════════════════════════════════════╝
echo.

:: Check Node is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js not found.
    echo   Install Node.js 18+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo   [1/4]  Installing dependencies...
call npm install --silent
if %errorlevel% neq 0 (
    echo   [ERROR] npm install failed.
    pause
    exit /b 1
)
echo          Done.

echo.
echo   [2/4]  Building React frontend...
call npx vite build --logLevel silent
if %errorlevel% neq 0 (
    echo   [ERROR] Vite build failed.
    pause
    exit /b 1
)
echo          Done.

echo.
echo   [3/4]  Packaging app...
call npx electron-packager . NotaraCBR --platform=win32 --arch=x64 --out=dist-electron --overwrite --ignore="^/src" --ignore="^/\.git" --ignore="^/dist-electron" --ignore="^/scripts" --electron-version=31.7.7 --icon=public/icon.ico --quiet
if %errorlevel% neq 0 (
    echo   [ERROR] Packaging failed.
    pause
    exit /b 1
)
echo          Done.

echo.
echo   [4/4]  Creating installer...
call node scripts\create-installer.js
if %errorlevel% neq 0 (
    echo   [ERROR] Installer creation failed.
    pause
    exit /b 1
)

echo.
echo   ╔══════════════════════════════════════════╗
echo   ║   Build complete!                        ║
echo   ║                                          ║
echo   ║   Setup:    dist-electron\installer\     ║
echo   ║             NotaraCBR-Setup.exe          ║
echo   ║                                          ║
echo   ║   Portable: dist-electron\               ║
echo   ║             NotaraCBR-win32-x64\         ║
echo   ╚══════════════════════════════════════════╝
echo.
pause
